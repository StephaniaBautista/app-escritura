import { createClient } from '@supabase/supabase-js'

export const SUPABASE_BUCKET = 'character-images'
export const SUPABASE_RACE_BUCKET = process.env.SUPABASE_RACE_BUCKET || 'race-images'
export const SUPABASE_CREATURE_BUCKET = process.env.SUPABASE_CREATURE_BUCKET || 'creature-images'

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
