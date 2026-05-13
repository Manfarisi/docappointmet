// src/utils/supabaseClient.js (BE / Node.js)
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL          // tanpa VITE_
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY  // pakai service role key untuk BE

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)