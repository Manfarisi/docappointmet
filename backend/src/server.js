import express from 'express'
import cors from 'cors'
import { supabase } from './utils/supabaseClient.js'

const app = express()
const PORT = process.env.PORT || 5000
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET

app.use(cors())
app.use(express.json())

app.post('/create-doctor', async (req, res) => {
  if (ADMIN_API_SECRET && req.headers['x-admin-secret'] !== ADMIN_API_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }

  const {
    email,
    password,
    full_name,
    phone,
    avatar_url,
    speciality_id,
    experience_years,
    bio,
    consultation_fee
  } = req.body

  if (!email || !password || !full_name || !speciality_id) {
    return res.status(400).json({ success: false, error: 'Email, password, full_name, and speciality_id are required.' })
  }

  try {
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email_confirm: true,
      email,
      password,
      user_metadata: {
        full_name,
        role: 'doctor'
      }
    })

    if (authError) {
      throw authError
    }

    const authUser = data?.user || data
    if (!authUser?.id) {
      throw new Error('Failed to create auth user')
    }

    const { error: profileError } = await supabase
      .from('users')
      .insert([{ 
        id: authUser.id,
        email,
        full_name,
        role: 'doctor',
        phone: phone || null,
        avatar_url: avatar_url || null,
        speciality_id,
        experience_years: experience_years || 0,
        bio: bio || null,
        consultation_fee: consultation_fee || 0,
        is_active: true
      }])

    if (profileError) {
      // If profile creation fails, remove auth user to avoid partial state
      await supabase.auth.admin.deleteUser(authUser.id).catch(() => null)
      throw profileError
    }

    return res.status(201).json({ success: true, doctorId: authUser.id })
  } catch (error) {
    return res.status(400).json({ success: false, error: error?.message || 'Unable to create doctor.' })
  }
})

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Doctor management API is running.' })
})

app.listen(PORT, () => {
  console.log(`Backend server started on http://localhost:${PORT}`)
})