# 🚀 Supabase Project Setup Guide

## Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Sign up/Login to your account
3. Click "New Project"
4. Fill in:
   - **Name**: `docappointment` (or any name you like)
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to you (e.g., Singapore, Tokyo, etc.)
5. Click "Create new project"
6. Wait 2-3 minutes for setup to complete

## Step 2: Get Your Project Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 3: Update Environment Variables
Replace the placeholder values in `frontend/.env`:

```env
# Replace these with your actual values from Supabase dashboard
VITE_SUPABASE_URL=https://your-actual-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

## Step 4: Run Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `backend/database_schema.sql`
3. Paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

## Step 5: Verify Setup
1. Restart your dev server: `npm run dev`
2. Open http://localhost:5174
3. Try to register a new account
4. Check Supabase dashboard → **Authentication** → **Users** to see if user was created

## 🔧 Troubleshooting

### If you still get "Failed to fetch":
1. **Check .env file**: Make sure URL and key are correct (no extra spaces)
2. **Check Supabase project**: Is it active? Not paused?
3. **Check network**: Can you access Supabase dashboard?
4. **Check browser console**: Any CORS errors?

### If registration succeeds but login fails:
1. Check if email confirmation is required in Supabase Auth settings
2. Go to **Authentication** → **Settings** → **Enable email confirmations** (turn off for development)

### If database queries fail:
1. Make sure you ran the SQL schema
2. Check **Table Editor** in Supabase to see if tables were created
3. Check **Authentication** → **Policies** for RLS issues

## 📋 What the Schema Creates

- **users** table with patient/doctor roles
- **specialities** table (General Physician, etc.)
- **appointments** table with booking logic
- **time_slots** table for doctor availability
- **RLS policies** for security
- **Indexes** for performance

## 🎯 Next Steps After Setup

Once authentication works:
1. Update `Doctors.jsx` to fetch doctors from Supabase
2. Update `Appointment.jsx` for booking functionality
3. Update `MyAppointments.jsx` to show user's bookings
4. Update `MyProfile.jsx` for profile management

## 💡 Pro Tips

- Keep your anon key secret (don't commit to git)
- Use different Supabase projects for dev/staging/production
- Enable Row Level Security for production
- Monitor usage in Supabase dashboard

Need help with any step?