# DocAppointment - Supabase Setup Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js
```

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for setup to complete

### 3. Get Project Credentials
1. Go to Settings → API
2. Copy:
   - Project URL
   - Anon public key

### 4. Configure Environment Variables
Update `.env` file in frontend folder:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run Database Schema
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `backend/database_schema.sql`
3. Run the query

### 6. Test the App
```bash
npm run dev
```

## 📋 Features Implemented

### ✅ Authentication
- User registration (patient/doctor)
- Login/logout
- Session persistence
- Protected routes

### ✅ Database Schema
- Users table with role-based access
- Appointments with conflict prevention
- Doctor specialities
- Time slots management
- Row Level Security (RLS) enabled

### ✅ Security
- JWT authentication
- RLS policies for data access
- Input validation
- SQL injection prevention

## 🔧 Available Scripts

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/     # UI components
│   ├── context/        # React context (AppContext)
│   ├── pages/         # Page components
│   ├── utils/         # Supabase client & helpers
│   └── assets/        # Static assets
├── .env               # Environment variables
└── package.json       # Dependencies

backend/
└── database_schema.sql # Supabase database schema
```

## 🔐 Environment Variables

Make sure to set these in your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🗄️ Database Tables

1. **users** - User accounts (patients & doctors)
2. **specialities** - Medical specialities
3. **appointments** - Appointment bookings
4. **time_slots** - Doctor availability slots

## 🚨 Important Notes

- Never commit `.env` file to version control
- Keep your Supabase keys secure
- Test authentication flow thoroughly
- Database schema includes RLS - ensure policies are correct

## 🐛 Troubleshooting

### Common Issues:
1. **"Missing Supabase environment variables"**
   - Check `.env` file exists and variables are set correctly

2. **Authentication not working**
   - Verify Supabase project is active
   - Check anon key is correct
   - Ensure RLS policies allow access

3. **Database connection failed**
   - Run the SQL schema in Supabase dashboard
   - Check database is not paused

## 📞 Support

If you encounter issues:
1. Check Supabase dashboard for errors
2. Verify environment variables
3. Test with Supabase documentation
4. Check browser console for errors