import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import {
  deriveKey, newSalt, decryptJSON, encryptJSON,
  generateDEK, wrapDEK, unwrapDEK,
  generateRecoveryPhrase, normalizeRecoveryPhrase,
} from '../lib/crypto'
import { fetchSalt, fetchVault, pushVault, pushWrappingChange } from '../lib/sync'

// Stages:
//   'legacy'  – no backend configured, app runs local-only
//   'loading' – checking session
//   'auth'    – no session, show sign in / sign up
//   'lock'    – session present but DEK not in memory (after reload)
//   'unlock'  – ready, DEK derived, data available
const SALT_CACHE_KEY = 'networth_salt_v1'

export function useVault() {
  const [stage, setStage] = useState(isConfigured ? 'loading' : 'legacy')
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  // The DEK is what actually encrypts the vault. KEKs (derived from passwords
  // or recovery phrases) only wrap/unwrap it. Held in memory only.
  const dekRef = useRef(null)
  const saltRef = useRef(null)
  const versionRef = useRef(0)
  const [initialData, setInitialData] = useState(null)
  // After signup, hold the recovery phrase here so the UI can show it once.
  const [pendingRecoveryPhrase, setPendingRecoveryPhrase] = useState(null)

  useEffect(() => {
    if (!isConfigured) return
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) { setUser(session.user); setStage('lock') }
      else { setStage('auth') }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        dekRef.current = null
        saltRef.current = null
        setUser(null)
        setInitialData(null)
        setStage('auth')
      } else {
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

  // Migrate a legacy row (encrypted directly with KEK_p) to the DEK format.
  // Decrypts with the old KEK, generates a fresh DEK, re-encrypts with DEK,
  // wraps DEK with KEK_p, and saves.
  async function migrateLegacyRow(userId, kek, row) {
    const data = await decryptJSON(kek, { ciphertext: row.ciphertext, iv: row.iv })
    const dek = await generateDEK()
    const { wrapped, iv: wrappedIv } = await wrapDEK(dek, kek)
    versionRef.current = row.version + 1
    await pushVault({
      userId, dek, salt: row.salt, data, version: versionRef.current,
      wrappedDek: wrapped, wrappedDekIv: wrappedIv,
    })
    return { dek, data }
  }

  const signUp = useCallback(async (email, password) => {
    setError(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); return }
    if (!data.user) { setError('Confirm your email, then sign in.'); return }
    // Generate fresh DEK + salt, wrap DEK with the password-derived KEK,
    // and seed the server with an empty vault.
    const salt = newSalt()
    saltRef.current = salt
    saveCachedSalt(salt)
    const kek = await deriveKey(password, salt)
    const dek = await generateDEK()
    dekRef.current = dek
    const { wrapped, iv: wrappedIv } = await wrapDEK(dek, kek)
    // Auto-generate a recovery phrase at signup. The phrase is shown to the
    // user once via pendingRecoveryPhrase and never stored anywhere readable.
    const phrase = generateRecoveryPhrase()
    const recoverySalt = newSalt()
    const recoveryKek = await deriveKey(phrase, recoverySalt)
    const { wrapped: rWrapped, iv: rWrappedIv } = await wrapDEK(dek, recoveryKek)
    versionRef.current = 1
    const emptyData = { categories: [], snapshots: {}, goal: null }
    try {
      await pushVault({
        userId: data.user.id, dek, salt, data: emptyData, version: 1,
        wrappedDek: wrapped, wrappedDekIv: wrappedIv,
        wrappedDekRecovery: rWrapped, wrappedDekRecoveryIv: rWrappedIv,
        recoverySalt,
      })
    } catch {
      // Network errors during initial push — first edit will retry.
    }
    setInitialData(emptyData)
    setPendingRecoveryPhrase(phrase)
    setStage('unlock')
  }, [saveCachedSalt])

  const unlockWithPassword = useCallback(async (password, userId) => {
    setError(null)
    try {
      // Prefer the server's salt — it lives with the vault row. If the row
      // doesn't exist yet, fall back to cached/new for first-time sign-in.
      let salt = await fetchSalt(userId)
      if (!salt) salt = cachedSalt() || newSalt()
      saltRef.current = salt
      saveCachedSalt(salt)
      const kek = await deriveKey(password, salt)

      const row = await fetchVault(userId)
      if (!row) {
        // No vault yet — happens if signup didn't push successfully.
        const dek = await generateDEK()
        dekRef.current = dek
        versionRef.current = 0
        setInitialData(null)
        setStage('unlock')
        return
      }
      let dek, data
      if (row.wrapped_dek) {
        dek = await unwrapDEK(row.wrapped_dek, row.wrapped_dek_iv, kek)
        data = await decryptJSON(dek, { ciphertext: row.ciphertext, iv: row.iv })
        versionRef.current = row.version
      } else {
        // Legacy row from pre-DEK days. Migrate transparently.
        ;({ dek, data } = await migrateLegacyRow(userId, kek, row))
      }
      dekRef.current = dek
      setInitialData(data)
      setStage('unlock')
    } catch {
      dekRef.current = null
      setError('Could not unlock. Check your password.')
    }
  }, [cachedSalt, saveCachedSalt])

  const signIn = useCallback(async (email, password) => {
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    await unlockWithPassword(password, data.user.id)
  }, [unlockWithPassword])

  const unlock = useCallback(async (password) => {
    if (!user) return
    await unlockWithPassword(password, user.id)
  }, [user, unlockWithPassword])

  const signOut = useCallback(async () => {
    dekRef.current = null
    saltRef.current = null
    setInitialData(null)
    await supabase.auth.signOut()
  }, [])

  // Triggers Supabase's hosted email reset. The user clicks the link in the
  // email, sets a new auth password on Supabase's page, then comes back here
  // and signs in. They'll land on the lock screen because the new password
  // doesn't derive the original encryption key — they then use either their
  // recovery phrase or the destructive reset.
  const requestPasswordReset = useCallback(async (email) => {
    if (!email) return { ok: false, error: 'Email is required.' }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [])

  // Forgot-password escape hatch on the lock screen.
  const resetVault = useCallback(async () => {
    if (!user) return
    try { await supabase.from('vaults').delete().eq('user_id', user.id) } catch {}
    try { localStorage.removeItem(SALT_CACHE_KEY) } catch {}
    try { localStorage.removeItem('networth_v1') } catch {}
    dekRef.current = null
    saltRef.current = null
    setInitialData(null)
    await supabase.auth.signOut()
  }, [user])

  // Debounced push of the real ("none") data — encrypted with the DEK.
  const pushData = useCallback(async (data) => {
    if (!user || !dekRef.current || !saltRef.current) return
    versionRef.current += 1
    try {
      const row = await fetchVault(user.id)
      await pushVault({
        userId: user.id,
        dek: dekRef.current,
        salt: saltRef.current,
        data,
        version: versionRef.current,
        // Preserve existing wrapping fields. Without this, an upsert would
        // null them out and we'd lose the recovery wrap.
        wrappedDek: row?.wrapped_dek,
        wrappedDekIv: row?.wrapped_dek_iv,
        wrappedDekRecovery: row?.wrapped_dek_recovery,
        wrappedDekRecoveryIv: row?.wrapped_dek_recovery_iv,
        recoverySalt: row?.recovery_salt,
      })
    } catch {
      // Offline / transient — local cache still holds the data; retry next change.
    }
  }, [user])

  // Change password while signed in: re-wrap the existing DEK with a key
  // derived from the new password. Ciphertext is unchanged.
  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    if (!user || !dekRef.current || !saltRef.current) {
      return { ok: false, error: 'Not signed in.' }
    }
    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: 'New password must be at least 8 characters.' }
    }
    try {
      // Verify the current password by re-deriving and unwrapping.
      const oldKek = await deriveKey(currentPassword, saltRef.current)
      const row = await fetchVault(user.id)
      if (!row?.wrapped_dek) return { ok: false, error: 'Vault not ready.' }
      try {
        await unwrapDEK(row.wrapped_dek, row.wrapped_dek_iv, oldKek)
      } catch {
        return { ok: false, error: 'Current password is incorrect.' }
      }
      // Wrap the existing DEK with a key derived from the new password.
      const newKek = await deriveKey(newPassword, saltRef.current)
      const { wrapped, iv: wrappedIv } = await wrapDEK(dekRef.current, newKek)
      versionRef.current = row.version + 1
      await pushWrappingChange({
        userId: user.id, version: versionRef.current, salt: saltRef.current,
        wrappedDek: wrapped, wrappedDekIv: wrappedIv,
        ciphertext: row.ciphertext, iv: row.iv,
      })
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        // Rollback to old wrap so user can still sign in with old password.
        const { wrapped: oldWrapped, iv: oldWrappedIv } = await wrapDEK(dekRef.current, oldKek)
        try {
          await pushWrappingChange({
            userId: user.id, version: ++versionRef.current, salt: saltRef.current,
            wrappedDek: oldWrapped, wrappedDekIv: oldWrappedIv,
            ciphertext: row.ciphertext, iv: row.iv,
          })
        } catch {}
        return { ok: false, error: error.message }
      }
      return { ok: true }
    } catch {
      return { ok: false, error: 'Could not change password. Try again.' }
    }
  }, [user])

  // Generate (or regenerate) a recovery phrase. Wraps the existing DEK with
  // a key derived from a freshly random phrase and saves wrapped_dek_recovery.
  // Returns the phrase ONCE — caller must show it to the user immediately.
  const generateRecovery = useCallback(async () => {
    if (!user || !dekRef.current || !saltRef.current) {
      return { ok: false, error: 'Not signed in.' }
    }
    try {
      const phrase = generateRecoveryPhrase()
      const recoverySalt = newSalt()
      const recoveryKek = await deriveKey(phrase, recoverySalt)
      const { wrapped, iv: wrappedIv } = await wrapDEK(dekRef.current, recoveryKek)
      const row = await fetchVault(user.id)
      versionRef.current = (row?.version ?? 0) + 1
      await pushWrappingChange({
        userId: user.id, version: versionRef.current, salt: saltRef.current,
        wrappedDek: row.wrapped_dek, wrappedDekIv: row.wrapped_dek_iv,
        wrappedDekRecovery: wrapped, wrappedDekRecoveryIv: wrappedIv,
        recoverySalt,
        ciphertext: row.ciphertext, iv: row.iv,
      })
      return { ok: true, phrase }
    } catch (e) {
      return { ok: false, error: 'Could not generate recovery phrase.' }
    }
  }, [user])

  // Recovery unlock from the lock screen: user is signed in (their auth
  // password works) but can't decrypt the vault — typically because they
  // reset their password via Supabase's email flow. They provide their
  // recovery phrase + the current auth password. We unwrap the DEK with the
  // phrase, then re-wrap it with the password's KEK so future unlocks work.
  const unlockWithRecovery = useCallback(async ({ recoveryPhrase, currentPassword }) => {
    if (!user) return { ok: false, error: 'Sign in first.' }
    if (!recoveryPhrase || !currentPassword) {
      return { ok: false, error: 'Recovery phrase and password are required.' }
    }
    try {
      const row = await fetchVault(user.id)
      if (!row?.wrapped_dek_recovery || !row.recovery_salt) {
        return { ok: false, error: 'No recovery phrase has been set on this account.' }
      }
      const normalized = normalizeRecoveryPhrase(recoveryPhrase)
      if (normalized.length < 32) {
        return { ok: false, error: 'Recovery phrase looks incomplete.' }
      }
      const recoveryKek = await deriveKey(normalized, row.recovery_salt)
      let dek
      try {
        dek = await unwrapDEK(row.wrapped_dek_recovery, row.wrapped_dek_recovery_iv, recoveryKek)
      } catch {
        return { ok: false, error: 'Recovery phrase is incorrect.' }
      }
      saltRef.current = row.salt
      const newKek = await deriveKey(currentPassword, row.salt)
      const { wrapped, iv: wrappedIv } = await wrapDEK(dek, newKek)
      versionRef.current = row.version + 1
      await pushWrappingChange({
        userId: user.id, version: versionRef.current, salt: row.salt,
        wrappedDek: wrapped, wrappedDekIv: wrappedIv,
        ciphertext: row.ciphertext, iv: row.iv,
      })
      dekRef.current = dek
      const data = await decryptJSON(dek, { ciphertext: row.ciphertext, iv: row.iv })
      setInitialData(data)
      setStage('unlock')
      return { ok: true }
    } catch {
      return { ok: false, error: 'Recovery failed. Try again.' }
    }
  }, [user])

  const clearPendingRecoveryPhrase = useCallback(() => setPendingRecoveryPhrase(null), [])

  return {
    stage, user, error, initialData,
    pendingRecoveryPhrase, clearPendingRecoveryPhrase,
    signUp, signIn, unlock, signOut, resetVault, changePassword,
    generateRecovery, unlockWithRecovery, requestPasswordReset,
    pushData,
  }
}
