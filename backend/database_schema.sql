-- ===========================================
-- DocAppointment Database Schema
-- Supabase PostgreSQL - Final Version
-- Updated: includes all fixes & improvements
-- ===========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ===========================================
-- ENUM TYPES
-- ===========================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ===========================================
-- TABLES
-- ===========================================

-- Specialities
CREATE TABLE IF NOT EXISTS public.specialities (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT        NOT NULL UNIQUE,
    description TEXT,
    icon_url    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (patients, doctors, admins)
CREATE TABLE IF NOT EXISTS public.users (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email            TEXT        NOT NULL UNIQUE,
    full_name        TEXT        NOT NULL,
    role             user_role   NOT NULL,
    phone            TEXT,
    avatar_url       TEXT,
    speciality_id    UUID        REFERENCES public.specialities(id) ON DELETE SET NULL,
    experience_years INTEGER     CHECK (experience_years >= 0),
    bio              TEXT,
    is_active        BOOLEAN     NOT NULL DEFAULT true,  -- ← baru: nonaktifkan tanpa hapus data
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_email
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),

    CONSTRAINT valid_phone
        CHECK (phone IS NULL OR phone ~* '^\+?[0-9\s\-\(\)]+$'),

    CONSTRAINT doctor_must_have_speciality CHECK (
        (role = 'doctor'  AND speciality_id IS NOT NULL) OR
        (role = 'patient' AND speciality_id IS NULL)     OR
        (role = 'admin')
    ),

    CONSTRAINT doctor_must_have_experience CHECK (
        (role = 'doctor'  AND experience_years IS NOT NULL) OR
        (role = 'patient') OR
        (role = 'admin')
    )
);

-- Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id               UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id       UUID               NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id        UUID               NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    appointment_date DATE               NOT NULL,
    appointment_time TIME               NOT NULL,
    status           appointment_status NOT NULL DEFAULT 'pending',
    notes            TEXT,
    cancelled_reason TEXT,                                           -- ← baru: alasan pembatalan
    cancelled_by     UUID               REFERENCES public.users(id), -- ← baru: siapa yang batalkan
    created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

    CONSTRAINT different_patient_doctor
        CHECK (patient_id != doctor_id),

    -- Dihapus agar admin bisa lihat history lama
    -- CONSTRAINT future_appointment CHECK (appointment_date >= CURRENT_DATE),

    CONSTRAINT valid_time_range
        CHECK (appointment_time >= '08:00:00' AND appointment_time <= '20:00:00'),

    CONSTRAINT unique_doctor_slot
        UNIQUE (doctor_id, appointment_date, appointment_time)
);

-- Time Slots
CREATE TABLE IF NOT EXISTS public.time_slots (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date         DATE        NOT NULL,
    start_time   TIME        NOT NULL,
    end_time     TIME        NOT NULL,
    is_available BOOLEAN     NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_time_slot
        CHECK (start_time < end_time),

    CONSTRAINT future_date
        CHECK (date >= CURRENT_DATE),

    CONSTRAINT valid_slot_duration
        CHECK (EXTRACT(EPOCH FROM (end_time - start_time)) / 60 BETWEEN 15 AND 120),

    CONSTRAINT unique_doctor_time_slot
        UNIQUE (doctor_id, date, start_time, end_time)
);

-- Doctor Weekly Schedules (template jadwal mingguan)  ← baru
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    day_of_week INTEGER     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Minggu, 1=Senin, dst
    start_time  TIME        NOT NULL,
    end_time    TIME        NOT NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_schedule_time CHECK (start_time < end_time),
    CONSTRAINT unique_doctor_day   UNIQUE (doctor_id, day_of_week)
);

-- Payments  ← baru
CREATE TABLE IF NOT EXISTS public.payments (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID        NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    amount         NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    status         TEXT        NOT NULL DEFAULT 'unpaid'
                               CHECK (status IN ('unpaid', 'paid', 'refunded')),
    method         TEXT        CHECK (method IN ('cash', 'transfer', 'midtrans', 'other')),
    paid_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_appointment_payment UNIQUE (appointment_id)
);

-- Reviews  ← baru
CREATE TABLE IF NOT EXISTS public.reviews (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID        NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE UNIQUE,
    patient_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating         INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT review_after_appointment CHECK (true) -- validasi di aplikasi: hanya appointment 'completed'
);

-- Notifications  ← baru
CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title      TEXT        NOT NULL,
    body       TEXT        NOT NULL,
    type       TEXT        CHECK (type IN ('appointment_reminder', 'status_change', 'payment', 'general')),
    is_read    BOOLEAN     NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs (admin tracking)  ← baru
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    action     TEXT        NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    table_name TEXT        NOT NULL,
    record_id  UUID,
    old_data   JSONB,
    new_data   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ===========================================
-- TAMBAHAN KOLOM KE USERS
-- ===========================================

-- Fee konsultasi per dokter
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(10,2) DEFAULT 0;


-- ===========================================
-- INDEXES
-- ===========================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email         ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role          ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_speciality_id ON public.users(speciality_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active     ON public.users(is_active);

-- Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id   ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id    ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date         ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status       ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date  ON public.appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON public.appointments(patient_id, appointment_date);

-- Time Slots
CREATE INDEX IF NOT EXISTS idx_time_slots_doctor_id   ON public.time_slots(doctor_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_date        ON public.time_slots(date);
CREATE INDEX IF NOT EXISTS idx_time_slots_available   ON public.time_slots(is_available);
CREATE INDEX IF NOT EXISTS idx_time_slots_doctor_date ON public.time_slots(doctor_id, date);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status         ON public.payments(status);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_doctor_id  ON public.reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_patient_id ON public.reviews(patient_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON public.notifications(is_read);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- Doctor Schedules
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_id ON public.doctor_schedules(doctor_id);


-- ===========================================
-- TRIGGERS: AUTO-UPDATE updated_at
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_specialities_updated_at
    BEFORE UPDATE ON public.specialities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ===========================================
-- FUNCTION: Helper role check (PENTING!)
-- Dipakai oleh semua RLS policy admin
-- Jalankan dengan role: postgres
-- ===========================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       ENABLE ROW LEVEL SECURITY;


-- ===========================================
-- RLS POLICIES: SPECIALITIES
-- ===========================================

DROP POLICY IF EXISTS "specialities_select_all"  ON public.specialities;
DROP POLICY IF EXISTS "specialities_all_admin"   ON public.specialities;

CREATE POLICY "specialities_select_all" ON public.specialities
    FOR SELECT USING (true);

CREATE POLICY "specialities_all_admin" ON public.specialities
    FOR ALL USING (public.get_user_role() = 'admin');


-- ===========================================
-- RLS POLICIES: USERS
-- ===========================================

DROP POLICY IF EXISTS "users_select_admin"              ON public.users;
DROP POLICY IF EXISTS "users_insert_admin"              ON public.users;
DROP POLICY IF EXISTS "users_update_admin"              ON public.users;
DROP POLICY IF EXISTS "users_delete_admin"              ON public.users;
DROP POLICY IF EXISTS "users_select_self"               ON public.users;
DROP POLICY IF EXISTS "users_update_self"               ON public.users;
DROP POLICY IF EXISTS "users_select_doctors_by_patient" ON public.users;
DROP POLICY IF EXISTS "users_select_patients_by_doctor" ON public.users;
DROP POLICY IF EXISTS "users_insert_self_registration"  ON public.users;

-- Admin: full CRUD semua user
CREATE POLICY "users_select_admin" ON public.users
    FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY "users_insert_admin" ON public.users
    FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "users_update_admin" ON public.users
    FOR UPDATE USING (public.get_user_role() = 'admin');

CREATE POLICY "users_delete_admin" ON public.users
    FOR DELETE USING (public.get_user_role() = 'admin');

-- Semua user: lihat & update profil sendiri
CREATE POLICY "users_select_self" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_self" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Pasien: lihat profil semua dokter aktif
CREATE POLICY "users_select_doctors_by_patient" ON public.users
    FOR SELECT USING (role = 'doctor' AND is_active = true);

-- Dokter: lihat profil pasien yang punya appointment dengannya
CREATE POLICY "users_select_patients_by_doctor" ON public.users
    FOR SELECT USING (
        role = 'patient' AND
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.patient_id = users.id
              AND a.doctor_id  = auth.uid()
        )
    );

-- Public: self-registration
CREATE POLICY "users_insert_self_registration" ON public.users
    FOR INSERT WITH CHECK (true);


-- ===========================================
-- RLS POLICIES: APPOINTMENTS
-- ===========================================

DROP POLICY IF EXISTS "appointments_all_admin"      ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_self"    ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_patient" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_self"    ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_patient" ON public.appointments;

CREATE POLICY "appointments_all_admin" ON public.appointments
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "appointments_select_self" ON public.appointments
    FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "appointments_insert_patient" ON public.appointments
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "appointments_update_self" ON public.appointments
    FOR UPDATE USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "appointments_delete_patient" ON public.appointments
    FOR DELETE USING (auth.uid() = patient_id AND status = 'pending');


-- ===========================================
-- RLS POLICIES: TIME SLOTS
-- ===========================================

DROP POLICY IF EXISTS "time_slots_all_admin"         ON public.time_slots;
DROP POLICY IF EXISTS "time_slots_all_doctor"        ON public.time_slots;
DROP POLICY IF EXISTS "time_slots_select_available"  ON public.time_slots;

CREATE POLICY "time_slots_all_admin" ON public.time_slots
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "time_slots_all_doctor" ON public.time_slots
    FOR ALL USING (auth.uid() = doctor_id);

CREATE POLICY "time_slots_select_available" ON public.time_slots
    FOR SELECT USING (is_available = true);


-- ===========================================
-- RLS POLICIES: DOCTOR SCHEDULES
-- ===========================================

CREATE POLICY "schedules_all_admin" ON public.doctor_schedules
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "schedules_all_doctor" ON public.doctor_schedules
    FOR ALL USING (auth.uid() = doctor_id);

CREATE POLICY "schedules_select_all" ON public.doctor_schedules
    FOR SELECT USING (is_active = true);


-- ===========================================
-- RLS POLICIES: PAYMENTS
-- ===========================================

CREATE POLICY "payments_all_admin" ON public.payments
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "payments_select_self" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = payments.appointment_id
              AND (a.patient_id = auth.uid() OR a.doctor_id = auth.uid())
        )
    );


-- ===========================================
-- RLS POLICIES: REVIEWS
-- ===========================================

CREATE POLICY "reviews_select_all" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "reviews_insert_patient" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "reviews_update_patient" ON public.reviews
    FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "reviews_all_admin" ON public.reviews
    FOR ALL USING (public.get_user_role() = 'admin');


-- ===========================================
-- RLS POLICIES: NOTIFICATIONS
-- ===========================================

CREATE POLICY "notifications_select_self" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_self" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_all_admin" ON public.notifications
    FOR ALL USING (public.get_user_role() = 'admin');


-- ===========================================
-- RLS POLICIES: AUDIT LOGS
-- ===========================================

CREATE POLICY "audit_logs_all_admin" ON public.audit_logs
    FOR ALL USING (public.get_user_role() = 'admin');


-- ===========================================
-- RLS POLICIES: STORAGE (bucket: avatars)
-- Jalankan setelah bucket 'avatars' dibuat di Storage Dashboard
-- ===========================================

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_admin"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_admin"  ON storage.objects;

CREATE POLICY "avatars_select_public" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_admin" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND public.get_user_role() = 'admin'
    );

CREATE POLICY "avatars_delete_admin" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND public.get_user_role() = 'admin'
    );


-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Cek konflik appointment
CREATE OR REPLACE FUNCTION check_appointment_conflict(
    p_doctor_id UUID,
    p_date      DATE,
    p_time      TIME
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.appointments
        WHERE doctor_id        = p_doctor_id
          AND appointment_date = p_date
          AND appointment_time = p_time
          AND status IN ('pending', 'confirmed')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ambil slot tersedia untuk dokter di tanggal tertentu
CREATE OR REPLACE FUNCTION get_available_slots(
    p_doctor_id UUID,
    p_date      DATE
) RETURNS TABLE (start_time TIME, end_time TIME) AS $$
BEGIN
    RETURN QUERY
    SELECT ts.start_time, ts.end_time
    FROM public.time_slots ts
    WHERE ts.doctor_id    = p_doctor_id
      AND ts.date         = p_date
      AND ts.is_available = true
      AND NOT EXISTS (
          SELECT 1 FROM public.appointments a
          WHERE a.doctor_id        = p_doctor_id
            AND a.appointment_date = p_date
            AND a.appointment_time >= ts.start_time
            AND a.appointment_time <  ts.end_time
            AND a.status IN ('pending', 'confirmed')
      )
    ORDER BY ts.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hitung rata-rata rating dokter
CREATE OR REPLACE FUNCTION get_doctor_rating(p_doctor_id UUID)
RETURNS NUMERIC AS $$
BEGIN
    RETURN (
        SELECT ROUND(AVG(rating)::NUMERIC, 1)
        FROM public.reviews
        WHERE doctor_id = p_doctor_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ===========================================
-- VIEWS
-- ===========================================

-- Detail appointment lengkap
CREATE OR REPLACE VIEW public.appointment_details AS
SELECT
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.notes,
    a.cancelled_reason,
    a.created_at,
    a.updated_at,
    p.id         AS patient_id,
    p.full_name  AS patient_name,
    p.email      AS patient_email,
    p.phone      AS patient_phone,
    d.id         AS doctor_id,
    d.full_name  AS doctor_name,
    d.email      AS doctor_email,
    d.phone      AS doctor_phone,
    d.consultation_fee,
    s.name       AS speciality_name,
    py.status    AS payment_status,
    py.amount    AS payment_amount
FROM public.appointments a
JOIN  public.users        p  ON a.patient_id    = p.id
JOIN  public.users        d  ON a.doctor_id     = d.id
LEFT JOIN public.specialities s  ON d.speciality_id = s.id
LEFT JOIN public.payments     py ON py.appointment_id = a.id;

-- Ringkasan dokter dengan rating & jumlah appointment
CREATE OR REPLACE VIEW public.doctor_summary AS
SELECT
    u.id,
    u.full_name,
    u.email,
    u.phone,
    u.avatar_url,
    u.experience_years,
    u.bio,
    u.consultation_fee,
    u.is_active,
    s.name                              AS speciality_name,
    get_doctor_rating(u.id)             AS avg_rating,
    COUNT(DISTINCT r.id)                AS total_reviews,
    COUNT(DISTINCT a.id)                AS total_appointments
FROM public.users u
LEFT JOIN public.specialities s  ON u.speciality_id  = s.id
LEFT JOIN public.reviews      r  ON r.doctor_id       = u.id
LEFT JOIN public.appointments a  ON a.doctor_id       = u.id
WHERE u.role = 'doctor'
GROUP BY u.id, s.name;


-- ===========================================
-- INITIAL DATA: Specialities
-- ===========================================

INSERT INTO public.specialities (name, description) VALUES
    ('General Physician',  'General medical care and health maintenance'),
    ('Gynecologist',       'Women''s health and reproductive care'),
    ('Dermatologist',      'Skin, hair, and nail care'),
    ('Pediatrician',       'Children''s health and development'),
    ('Neurologist',        'Brain and nervous system disorders'),
    ('Gastroenterologist', 'Digestive system and liver care'),
    ('Cardiologist',       'Heart and cardiovascular care'),
    ('Orthopedic',         'Bones, joints, and musculoskeletal care'),
    ('Ophthalmologist',    'Eye care and vision'),
    ('Dentist',            'Oral health and dental care')
ON CONFLICT (name) DO NOTHING;


-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON TABLE public.users            IS 'Semua akun user: pasien, dokter, dan admin';
COMMENT ON TABLE public.appointments     IS 'Booking appointment antara pasien dan dokter';
COMMENT ON TABLE public.specialities     IS 'Daftar spesialitas medis untuk dokter';
COMMENT ON TABLE public.time_slots       IS 'Jadwal tersedia yang dibuat oleh dokter per tanggal';
COMMENT ON TABLE public.doctor_schedules IS 'Template jadwal mingguan dokter';
COMMENT ON TABLE public.payments         IS 'Pembayaran per appointment';
COMMENT ON TABLE public.reviews          IS 'Rating & ulasan pasien untuk dokter';
COMMENT ON TABLE public.notifications    IS 'Notifikasi untuk pasien dan dokter';
COMMENT ON TABLE public.audit_logs       IS 'Log aktivitas admin untuk tracking perubahan data';

COMMENT ON COLUMN public.users.role              IS 'patient | doctor | admin';
COMMENT ON COLUMN public.users.is_active         IS 'false = dokter dinonaktifkan tanpa dihapus';
COMMENT ON COLUMN public.users.consultation_fee  IS 'Tarif konsultasi dokter dalam rupiah';
COMMENT ON COLUMN public.appointments.status     IS 'pending | confirmed | completed | cancelled';
COMMENT ON COLUMN public.appointments.cancelled_reason IS 'Alasan pembatalan appointment';
COMMENT ON COLUMN public.time_slots.is_available IS 'true jika slot belum dipesan';
COMMENT ON COLUMN public.reviews.rating          IS 'Rating 1-5 bintang dari pasien';
COMMENT ON FUNCTION public.get_user_role()       IS 'Helper RLS: ambil role user dari tabel users berdasarkan auth.uid()';