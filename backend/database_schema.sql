-- ===========================================
-- DocAppointment Database Schema
-- Supabase PostgreSQL - Clean Version
-- ===========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ===========================================
-- ENUM TYPES
-- ===========================================

CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');


-- ===========================================
-- TABLES
-- ===========================================

-- Specialities (dibuat duluan karena di-reference oleh users)
CREATE TABLE public.specialities (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT        NOT NULL UNIQUE,
    description TEXT,
    icon_url    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (patients, doctors, admins)
CREATE TABLE public.users (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email            TEXT        NOT NULL UNIQUE,
    full_name        TEXT        NOT NULL,
    role             user_role   NOT NULL,
    phone            TEXT,
    avatar_url       TEXT,
    speciality_id    UUID        REFERENCES public.specialities(id) ON DELETE SET NULL,
    experience_years INTEGER     CHECK (experience_years >= 0),
    bio              TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_email
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),

    CONSTRAINT valid_phone
        CHECK (phone IS NULL OR phone ~* '^\+?[0-9\s\-\(\)]+$'),

    -- Dokter wajib punya speciality, pasien tidak boleh punya speciality
    CONSTRAINT doctor_must_have_speciality CHECK (
        (role = 'doctor'  AND speciality_id IS NOT NULL) OR
        (role = 'patient' AND speciality_id IS NULL)     OR
        (role = 'admin')
    ),

    -- Dokter wajib isi pengalaman
    CONSTRAINT doctor_must_have_experience CHECK (
        (role = 'doctor'  AND experience_years IS NOT NULL) OR
        (role = 'patient') OR
        (role = 'admin')
    )
);

-- Appointments
CREATE TABLE public.appointments (
    id               UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id       UUID               NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id        UUID               NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    appointment_date DATE               NOT NULL,
    appointment_time TIME               NOT NULL,
    status           appointment_status NOT NULL DEFAULT 'pending',
    notes            TEXT,
    created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

    CONSTRAINT different_patient_doctor
        CHECK (patient_id != doctor_id),

    -- Hapus constraint future_appointment agar admin bisa lihat history
    -- CONSTRAINT future_appointment CHECK (appointment_date >= CURRENT_DATE),

    CONSTRAINT valid_time_range
        CHECK (appointment_time >= '08:00:00' AND appointment_time <= '20:00:00'),

    CONSTRAINT unique_doctor_slot
        UNIQUE (doctor_id, appointment_date, appointment_time)
);

-- Time Slots (jadwal yang disediakan dokter)
CREATE TABLE public.time_slots (
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

    -- Durasi slot antara 15 menit s/d 2 jam
    CONSTRAINT valid_slot_duration
        CHECK (EXTRACT(EPOCH FROM (end_time - start_time)) / 60 BETWEEN 15 AND 120),

    CONSTRAINT unique_doctor_time_slot
        UNIQUE (doctor_id, date, start_time, end_time)
);


-- ===========================================
-- INDEXES
-- ===========================================

-- Users
CREATE INDEX idx_users_email         ON public.users(email);
CREATE INDEX idx_users_role          ON public.users(role);
CREATE INDEX idx_users_speciality_id ON public.users(speciality_id);

-- Appointments
CREATE INDEX idx_appointments_patient_id   ON public.appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id    ON public.appointments(doctor_id);
CREATE INDEX idx_appointments_date         ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status       ON public.appointments(status);
CREATE INDEX idx_appointments_doctor_date  ON public.appointments(doctor_id, appointment_date);
CREATE INDEX idx_appointments_patient_date ON public.appointments(patient_id, appointment_date);

-- Time Slots
CREATE INDEX idx_time_slots_doctor_id   ON public.time_slots(doctor_id);
CREATE INDEX idx_time_slots_date        ON public.time_slots(date);
CREATE INDEX idx_time_slots_available   ON public.time_slots(is_available);
CREATE INDEX idx_time_slots_doctor_date ON public.time_slots(doctor_id, date);


-- ===========================================
-- TRIGGER: AUTO-UPDATE updated_at
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_specialities_updated_at
    BEFORE UPDATE ON public.specialities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots   ENABLE ROW LEVEL SECURITY;


-- ===========================================
-- RLS POLICIES: SPECIALITIES
-- ===========================================

-- Semua user bisa baca daftar spesialitas
CREATE POLICY "specialities_select_all"
    ON public.specialities FOR SELECT
    USING (true);

-- Hanya admin yang bisa CRUD spesialitas
CREATE POLICY "specialities_all_admin"
    ON public.specialities FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');


-- ===========================================
-- RLS POLICIES: USERS
-- ===========================================

-- [ADMIN] Bisa lihat semua user (dokter, pasien, admin lain)
CREATE POLICY "users_select_admin"
    ON public.users FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- [ADMIN] Bisa tambah user baru (termasuk dokter baru)
CREATE POLICY "users_insert_admin"
    ON public.users FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- [ADMIN] Bisa update user manapun (edit profil dokter, dll)
CREATE POLICY "users_update_admin"
    ON public.users FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin');

-- [ADMIN] Bisa hapus user manapun (nonaktifkan dokter, dll)
CREATE POLICY "users_delete_admin"
    ON public.users FOR DELETE
    USING (auth.jwt() ->> 'role' = 'admin');

-- [SEMUA] User bisa lihat & update profil sendiri
CREATE POLICY "users_select_self"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "users_update_self"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- [PASIEN] Bisa lihat profil semua dokter
CREATE POLICY "users_select_doctors_by_patient"
    ON public.users FOR SELECT
    USING (role = 'doctor');

-- [DOKTER] Bisa lihat profil pasien yang punya appointment dengannya
CREATE POLICY "users_select_patients_by_doctor"
    ON public.users FOR SELECT
    USING (
        role = 'patient' AND
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.patient_id = users.id
              AND a.doctor_id  = auth.uid()
        )
    );

-- [PUBLIC] Siapa saja bisa daftar akun baru (self-registration)
CREATE POLICY "users_insert_self_registration"
    ON public.users FOR INSERT
    WITH CHECK (true);


-- ===========================================
-- RLS POLICIES: APPOINTMENTS
-- ===========================================

-- [ADMIN] Bisa lihat, ubah, hapus semua appointment
CREATE POLICY "appointments_all_admin"
    ON public.appointments FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- [PASIEN & DOKTER] Hanya bisa lihat appointment milik mereka
CREATE POLICY "appointments_select_self"
    ON public.appointments FOR SELECT
    USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- [PASIEN] Bisa buat appointment untuk dirinya sendiri
CREATE POLICY "appointments_insert_patient"
    ON public.appointments FOR INSERT
    WITH CHECK (auth.uid() = patient_id);

-- [PASIEN & DOKTER] Bisa update appointment yang melibatkan mereka
-- (misal: dokter konfirmasi, pasien tambah catatan)
CREATE POLICY "appointments_update_self"
    ON public.appointments FOR UPDATE
    USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- [PASIEN] Hanya bisa hapus appointment miliknya sendiri yang masih 'pending'
CREATE POLICY "appointments_delete_patient"
    ON public.appointments FOR DELETE
    USING (auth.uid() = patient_id AND status = 'pending');


-- ===========================================
-- RLS POLICIES: TIME SLOTS
-- ===========================================

-- [ADMIN] Bisa manage semua time slot (termasuk milik dokter lain)
CREATE POLICY "time_slots_all_admin"
    ON public.time_slots FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- [DOKTER] Bisa CRUD time slot miliknya sendiri
CREATE POLICY "time_slots_all_doctor"
    ON public.time_slots FOR ALL
    USING (auth.uid() = doctor_id);

-- [PASIEN] Hanya bisa lihat slot yang tersedia
CREATE POLICY "time_slots_select_available"
    ON public.time_slots FOR SELECT
    USING (is_available = true);


-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Cek apakah slot waktu dokter sudah terisi
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

-- Ambil slot yang masih tersedia untuk dokter di tanggal tertentu
CREATE OR REPLACE FUNCTION get_available_slots(
    p_doctor_id UUID,
    p_date      DATE
) RETURNS TABLE (
    start_time TIME,
    end_time   TIME
) AS $$
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


-- ===========================================
-- VIEW: Detail Appointment
-- ===========================================

CREATE VIEW public.appointment_details AS
SELECT
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.notes,
    a.created_at,
    a.updated_at,
    -- Pasien
    p.id         AS patient_id,
    p.full_name  AS patient_name,
    p.email      AS patient_email,
    p.phone      AS patient_phone,
    -- Dokter
    d.id         AS doctor_id,
    d.full_name  AS doctor_name,
    d.email      AS doctor_email,
    d.phone      AS doctor_phone,
    -- Spesialitas dokter
    s.name       AS speciality_name
FROM public.appointments a
JOIN public.users       p ON a.patient_id    = p.id
JOIN public.users       d ON a.doctor_id     = d.id
LEFT JOIN public.specialities s ON d.speciality_id = s.id;


-- ===========================================
-- INITIAL DATA: Specialities
-- ===========================================

INSERT INTO public.specialities (name, description) VALUES
    ('General Physician',    'General medical care and health maintenance'),
    ('Gynecologist',         'Women''s health and reproductive care'),
    ('Dermatologist',        'Skin, hair, and nail care'),
    ('Pediatrician',         'Children''s health and development'),
    ('Neurologist',          'Brain and nervous system disorders'),
    ('Gastroenterologist',   'Digestive system and liver care'),
    ('Cardiologist',         'Heart and cardiovascular care'),
    ('Orthopedic',           'Bones, joints, and musculoskeletal care'),
    ('Ophthalmologist',      'Eye care and vision'),
    ('Dentist',              'Oral health and dental care');


-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON TABLE public.users        IS 'Semua akun user: pasien, dokter, dan admin';
COMMENT ON TABLE public.appointments IS 'Booking appointment antara pasien dan dokter';
COMMENT ON TABLE public.specialities IS 'Daftar spesialitas medis untuk dokter';
COMMENT ON TABLE public.time_slots   IS 'Jadwal tersedia yang dibuat oleh dokter';

COMMENT ON COLUMN public.users.role              IS 'patient | doctor | admin';
COMMENT ON COLUMN public.appointments.status     IS 'pending | confirmed | completed | cancelled';
COMMENT ON COLUMN public.time_slots.is_available IS 'true jika slot belum dipesan';