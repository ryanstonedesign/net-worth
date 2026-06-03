import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

// Capture the recovery-link indicator at module load — BEFORE the Supabase
// client is created and starts consuming the URL. Supabase's PASSWORD_RECOVERY
// event can fire before our React app mounts and subscribes, so we'd otherwise
// miss it and drop the user on the lock screen instead of the new-password
// screen.
const initialHash = typeof window !== 'undefined' ? window.location.hash : ''
const initialSearch = typeof window !== 'undefined' ? window.location.search : ''
export const arrivedFromPasswordReset =
  initialHash.includes('type=recovery') ||
  initialSearch.includes('type=recovery') ||
  /[?&]code=/.test(initialSearch)

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
