import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { deriveKey, newSalt, decryptJSON } from '../lib/crypto'
import { fetchSalt, fetchVault, pullVault, pushVault } from '../lib/sync'

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
        // Avoid spurious re-renders on token refresh — only swap user if id changed.
        setUser(prev => prev?.id === session.user.id ? prev : session.user)
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

  const signOut = useCallback(async () => {
    keyRef.current = null
    saltRef.current = null
    setInitialData(null)
    await supabase.auth.signOut()
  }, [])

  // Change password while signed in. Re-derives the encryption key with the
  // new password and re-encrypts the vault, then updates Supabase auth.
  // Order matters: write the new ciphertext FIRST. If the auth password update
  // fails after that, the user can still sign in with their old password (the
  // server vault has the new key, the auth has the old password — they'd be
  // stuck). So we update auth last and surface any failure clearly.
  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    if (!user || !keyRef.current || !saltRef.current) {
      return { ok: false, error: 'Not signed in.' }
    }
    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: 'New password must be at least 8 characters.' }
    }
    // Verify the current password by re-deriving and comparing decrypt.
    try {
      const verifyKey = await deriveKey(currentPassword, saltRef.current)
      const row = await fetchVault(user.id)
      if (!row) return { ok: false, error: 'No vault to re-encrypt.' }
      await decryptJSON(verifyKey, { ciphertext: row.ciphertext, iv: row.iv })
    } catch {
      return { ok: false, error: 'Current password is incorrect.' }
    }
    try {
      // Re-encrypt the in-memory data with a key derived from the new password.
      const newKey = await deriveKey(newPassword, saltRef.current)
      // Pull the latest from server so we re-encrypt the freshest copy.
      const row = await fetchVault(user.id)
      const data = await decryptJSON(keyRef.current, { ciphertext: row.ciphertext, iv: row.iv })
      versionRef.current = row.version + 1
      await pushVault({
        userId: user.id,
        key: newKey,
        salt: saltRef.current,
        data,
        version: versionRef.current,
      })
      // Vault now uses new key. Update Supabase auth password.
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        // Vault is re-encrypted with new key but auth still uses old password.
        // Roll back: re-encrypt with old key so user can sign in with old pw.
        try {
          await pushVault({
            userId: user.id,
            key: keyRef.current,
            salt: saltRef.current,
            data,
            version: ++versionRef.current,
          })
        } catch {}
        return { ok: false, error: error.message }
      }
      keyRef.current = newKey
      return { ok: true }
    } catch (e) {
      return { ok: false, error: 'Could not change password. Try again.' }
    }
  }, [user])

  // Destructive escape hatch when the user has forgotten their password (or
  // had it reset through Supabase) and can't decrypt the vault. Deletes the
  // ciphertext row on the server, clears the cached salt locally, then signs
  // out. The user can sign back in (their auth still works) and start fresh.
  const resetVault = useCallback(async () => {
    if (!user) return
    try {
      await supabase.from('vaults').delete().eq('user_id', user.id)
    } catch {}
    try { localStorage.removeItem(SALT_CACHE_KEY) } catch {}
    try { localStorage.removeItem('networth_v1') } catch {}
    keyRef.current = null
    saltRef.current = null
    setInitialData(null)
    await supabase.auth.signOut()
  }, [user])

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
    signUp, signIn, unlock, signOut, resetVault, changePassword, pushData,
  }
}
