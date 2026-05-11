# 🔐 Membuat Admin User untuk DocAppointment

## Cara 1: Menggunakan Supabase Dashboard (Paling Mudah)

### Step 1: Buat User Admin di Supabase Auth
1. Buka **Supabase Dashboard** → **Authentication** → **Users**
2. Klik **Add user**
3. Isi:
   - **Email**: `admin@docappointment.com` (atau email lain)
   - **Password**: `YourStrongPassword123!`
4. Klik **Create user**

### Step 2: Set Role ke Admin via SQL
1. Buka **SQL Editor** di Supabase dashboard
2. Jalankan query berikut:

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'admin@docappointment.com';
```

### Step 3: Buat User Entry di Public Schema
1. Jalankan SQL berikut untuk menambahkan admin ke tabel `users`:

```sql
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) 
SELECT 
  id,
  email,
  'Admin User' as full_name,
  'admin' as role,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users
WHERE email = 'admin@docappointment.com'
AND NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'admin@docappointment.com'
);
```

---

## Cara 2: Menggunakan Supabase CLI (Jika Development)

Jika Anda menggunakan Supabase CLI lokal:

```bash
# Create admin user
supabase auth admin create-user \
  --email admin@docappointment.com \
  --password YourStrongPassword123!
```

---

## Step 4: Test Login Admin

1. Buka aplikasi React di browser
2. Klik **Create Account** (atau Login jika sudah ada user)
3. Masuk dengan email & password admin:
   - Email: `admin@docappointment.com`
   - Password: `YourStrongPassword123!`
4. Setelah login berhasil, Anda akan **otomatis diarahkan ke `/admin/doctors`**

---

## Admin Dashboard Features

Setelah login sebagai admin, Anda dapat:
- ✅ **Add Doctor** - Tambah dokter baru
- ✅ **Edit Doctor** - Edit profil dokter
- ✅ **Delete Doctor** - Hapus dokter
- ✅ **View Doctors** - Lihat semua dokter

---

## Troubleshooting

### Admin tidak bisa akses `/admin/doctors`
- Pastikan email user sudah punya `role = 'admin'` di `auth.users.raw_user_meta_data`
- Pastikan juga ada entry di tabel `public.users` dengan `role = 'admin'`

### Redirect tidak berfungsi setelah login
- Clear browser cache dan refresh
- Check browser console untuk error messages

### Admin bisa lihat halaman tapi tidak bisa CRUD
- Pastikan RLS policies di Supabase mengizinkan admin
- Buka Supabase SQL Editor dan check policies di tabel `users`

---

## User Roles di Aplikasi

| Role | Akses |
|------|-------|
| **admin** | Admin dashboard, CRUD dokter |
| **doctor** | Profile dokter, lihat appointment |
| **patient** | Book appointment, lihat appointment sendiri |

---

## Security Notes

1. **Jangan share** password admin di publik
2. **Gunakan password kuat** minimal 12 karakter
3. **Enable email verification** di Supabase untuk production
4. **Set RLS policies** yang ketat di database

---

## Next Steps

Setelah admin user berhasil dibuat:
1. Test login sebagai admin
2. Tambah beberapa dokter melalui admin dashboard
3. Test booking appointment sebagai patient dengan dokter yang dibuat

Enjoy! 🎉