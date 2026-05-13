import express from 'express'
import cors from 'cors'
import { supabase } from './utils/supabaseClient.js'

const app = express()
const PORT = process.env.PORT || 5000
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_API_SECRET || ''

app.use(cors())
app.use(express.json())

const validateAdminSecret = (req, res, next) => {
  if (!ADMIN_SECRET_KEY) {
    return res.status(500).json({ success: false, error: 'Admin secret is not configured.' })
  }

  const secret = req.headers['x-admin-secret'] || req.headers['x-admin-secret'.toLowerCase()]
  if (secret !== ADMIN_SECRET_KEY) {
    return res.status(403).json({ success: false, error: 'Forbidden: invalid admin secret.' })
  }

  next()
}

const createUserProfile = async ({ id, email, full_name, role, phone, avatar_url, speciality_id, experience_years, bio, consultation_fee }) => {
  const userProfile = {
    id,
    email,
    full_name,
    role,
    phone: phone || null,
    avatar_url: avatar_url || null,
    speciality_id: speciality_id || null,
    experience_years: experience_years || 0,
    bio: bio || null,
    consultation_fee: consultation_fee || 0,
    is_active: true
  }

  if (role !== 'doctor') {
    delete userProfile.speciality_id
    delete userProfile.experience_years
    delete userProfile.consultation_fee
  }

  const { error } = await supabase
    .from('users')
    .insert([userProfile])

  return error
}

app.post('/admin/create-user', validateAdminSecret, async (req, res) => {
  const {
    email,
    password,
    full_name,
    role,
    phone,
    avatar_url,
    speciality_id,
    experience_years,
    bio,
    consultation_fee
  } = req.body

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ success: false, error: 'email, password, full_name, and role are required.' })
  }

  if (!['doctor', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, error: 'role must be either doctor or admin.' })
  }

  if (role === 'doctor' && !speciality_id) {
    return res.status(400).json({ success: false, error: 'speciality_id is required for doctor accounts.' })
  }

  try {
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        phone
      }
    })

    if (authError) {
      throw authError
    }

    const authUser = data?.user || data
    if (!authUser?.id) {
      throw new Error('Failed to create auth user.')
    }

    const profileError = await createUserProfile({
      id: authUser.id,
      email,
      full_name,
      role,
      phone,
      avatar_url,
      speciality_id,
      experience_years,
      bio,
      consultation_fee
    })

    if (profileError) {
      await supabase.auth.admin.deleteUser(authUser.id).catch(() => null)
      throw profileError
    }

    return res.status(201).json({ success: true, userId: authUser.id })
  } catch (error) {
    return res.status(400).json({ success: false, error: error?.message || 'Unable to create user.' })
  }
})

app.delete('/admin/delete-user/:id', validateAdminSecret, async (req, res) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ success: false, error: 'User id is required.' })
  }

  try {
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (profileError || authError) {
      const message = [profileError?.message, authError?.message].filter(Boolean).join(' | ')
      return res.status(500).json({ success: false, error: message || 'Failed to delete user.' })
    }

    return res.json({ success: true, message: 'User deleted from auth and users table.' })
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Unable to delete user.' })
  }
})

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Admin backend API is running.' })
})

app.listen(PORT, () => {
  console.log(`Backend server started on http://localhost:${PORT}`)
})