import { createClient, type Session } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in.',
  )
}

export const supabase = createClient(url, anonKey)

// Una sola richiesta di accesso anche con mount concorrenti/StrictMode: due
// sessioni anonime simultanee potrebbero separare creazione e appartenenza.
let pendingSession: Promise<Session> | null = null

export function ensureAnonymousSession(): Promise<Session> {
  if (!pendingSession) pendingSession = loadSession().finally(() => { pendingSession = null })
  return pendingSession
}

async function loadSession(): Promise<Session> {
  const { data, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (data.session) return data.session
  const { data: signedIn, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  if (!signedIn.session) throw new Error('Non riusciamo ad avviare la sessione. Riprova.')
  return signedIn.session
}
