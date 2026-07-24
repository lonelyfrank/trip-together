import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in.',
  )
}

export const supabase = createClient(url, anonKey)

/** Livello 0 — token device: sessione anonima persistita dal browser, nessun account. */
export async function ensureAnonymousSession() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session

  const { data: signedIn, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return signedIn.session
}
