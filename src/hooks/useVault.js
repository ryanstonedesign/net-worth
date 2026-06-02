import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { deriveKey, newSalt } from '../lib/crypto'
import { fetchSalt, pullVault, pushVault } from '../lib/sync'

// Stages:
//   'legacy'  – no backend configured, app runs local-only (no auth, no sync)
//   'loading' – checking session
//   'auth'    – no session, show sign in / sign up
//   'lock'    – session present but encryption key not in memory (after reload)
//   'unlock'  – ready, key derived, data available
const SALT_CACHE_KEY = 'networth_salt_v1'

export function useVault() {
  const [stage, setStage] = useState(isConfigured ? 'loading' : 'legacy')
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const keyRef = useRef(null)        // CryptoKey, kept in memory only
  const saltRef = useRef(null)
  const versionRef = useRef(0)
  const [initialData, setInitialData] = useState(null) // hand to useData on unlock

  // Session bootstrap
  useEffect(() => {
    if (!isConfigured) return
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        setStage('lock') // session valid, but key not derived yet
      } else {
        setStage('auth')
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        keyRef.current = null
        saltRef.current = null
        setUser(null)
        setInitialData(null)
        setStage('auth')
      } else {
        setUser(session.user)
      }
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  const cachedSalt = useCallback(() => {
    try { return localStorage.getItem(SALT_CACHE_KEY) } catch { return null }
  }, [])

  const saveCachedSalt = useCallback((salt) => {
    try { localStorage.setItem(SALT_CACHE_KEY, salt) } catch {}
  }, [])

  const signUp = useCallback(async (email, password) => {
    setError(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); return }
    if (!data.user) { setError('Confirm your email, then sign in.'); return }
    // Fresh user → mint a new salt, derive key, vault stays empty until first save.
    const salt = newSalt()
    saltRef.current = salt
    saveCachedSalt(salt)
    keyRef.current = await deriveKey(password, salt)
    versionRef.current = 0
    setInitialData(null)
    setStage('unlock')
  }, [saveCachedSalt])

  const signIn = useCallback(async (email, password) => {
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    await unlockWithPassword(password, data.user.id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const unlockWithPassword = useCallback(async (password, userId) => {
    setError(null)
    try {
      // Salt lives with the vault row. Pull just the salt first (cheap, no decrypt).
      let salt = await fetchSalt(userId)
      if (!salt) {
        salt = cachedSalt() || newSalt() // first-ever sign-in on a device
      }
      saltRef.current = salt
      saveCachedSalt(salt)
      keyRef.current = await deriveKey(password, salt)

      const pulled = await pullVault({ userId, key: keyRef.current })
      if (pulled) {
        versionRef.current = pulled.version
        setInitialData(pulled.data)
      } else {
        versionRef.current = 0
        setInitialData(null)
      }
      setStage('unlock')
    } catch (e) {
      // Most likely: wrong passphrase → AES-GCM tag mismatch throws.
      keyRef.current = null
      setError('Could not unlock. Check your password.')
    }
  }, [cachedSalt, saveCachedSalt])

  const unlock = useCallback(async (password) => {
    if (!user) return
    await unlockWithPassword(password, user.id)
  }, [user, unlockWithPassword])

  // Pull the latest vault and adopt it if the server has a newer version.
  // Used by both Realtime updates and visibility/pageshow refetches.
  const refresh = useCallback(async () => {
    if (!user || !keyRef.current) return
    try {
      const pulled = await pullVault({ userId: user.id, key: keyRef.current })
      if (!pulled) return
      // Always adopt the server's view — it's authoritative. The push-skip flag
      // in useData prevents an adopt-then-push echo loop.
      versionRef.current = pulled.version
      setInitialData(pulled.data)
    } catch {
      // Offline / transient — try again on next event.
    }
  }, [user])

  // Realtime: subscribe to row updates for this user. When another device pushes,
  // the websocket wakes us up and we re-pull + decrypt.
  useEffect(() => {
    if (stage !== 'unlock' || !user) return
    const channel = supabase
      .channel(`vault:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vaults', filter: `user_id=eq.${user.id}` },
        () => { refresh() },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [stage, user, refresh])

  // iOS Safari restores pages from bfcache instead of doing a real reload, so
  // visibilitychange/pageshow are the only reliable "user just opened the app"
  // signals on mobile. Refetch then to avoid stale data after backgrounding.
  useEffect(() => {
    if (stage !== 'unlock' || !user) return
    const onWake = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('pageshow', onWake)
    return () => {
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('pageshow', onWake)
    }
  }, [stage, user, refresh])

  const signOut = useCallback(async () => {
    keyRef.current = null
    saltRef.current = null
    setInitialData(null)
    await supabase.auth.signOut()
  }, [])

  // Called by useData after a debounced change. Pushes ciphertext, never plaintext.
  const pushData = useCallback(async (data) => {
    if (!user || !keyRef.current || !saltRef.current) return
    versionRef.current += 1
    try {
      await pushVault({
        userId: user.id,
        key: keyRef.current,
        salt: saltRef.current,
        data,
        version: versionRef.current,
      })
    } catch {
      // Offline / transient error — local cache still holds the data; retry on next change.
    }
  }, [user])

  return {
    stage, user, error, initialData,
    signUp, signIn, unlock, signOut, pushData,
  }
}
