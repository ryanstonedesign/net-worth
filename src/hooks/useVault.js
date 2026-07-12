import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isConfigured, arrivedFromPasswordReset } from '../lib/supabase'
import {
  deriveKey, newSalt, decryptJSON, encryptJSON,
  generateDEK, wrapDEK, unwrapDEK,
  generateRecoveryPhrase, normalizeRecoveryPhrase,
} from '../lib/crypto'
import { fetchSalt, fetchVault, pushVault, pushWrappingChange, pushAvatar } from '../lib/sync'

// Stages:
//   'legacy'         – no backend configured, app runs local-only
//   'loading'        – checking session
//   'auth'           – no session, show sign in / sign up
//   'recovery-reset' – arriving from a password reset email; set a new password
//   'lock'           – session present but DEK not in memory (after reload)
//   'unlock'         – ready, DEK derived, data available
const SALT_CACHE_KEY = 'networth_salt_v1'
// Survives refresh (cleared on tab close). Keeps the user on the Restore
// Access screen if they reload mid-reset — the recovery token in the URL is
// single-use and is gone by then, so we can't rely on it after the first load.
const RECOVERY_MODE_KEY = 'networth_recovery_mode'

function recoveryModeActive() {
  try { return sessionStorage.getItem(RECOVERY_MODE_KEY) === '1' } catch { return false }
}
function setRecoveryMode(on) {
  try {
    if (on) sessionStorage.setItem(RECOVERY_MODE_KEY, '1')
    else sessionStorage.removeItem(RECOVERY_MODE_KEY)
  } catch {}
}

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
  // Avatar photo from the vaults row (loaded at unlock). Kept OUT of auth
  // user metadata on purpose: metadata is embedded in every access token,
  // and a data-URL photo there bloats the JWT past gateway header limits —
  // fresh sign-ins hang on their first database request.
  const [avatar, setAvatar] = useState(null)
  // After signup, hold the recovery phrase here so the UI can show it once.
  const [pendingRecoveryPhrase, setPendingRecoveryPhrase] = useState(null)

  useEffect(() => {
    if (!isConfigured) return
    let mounted = true
    // Once recovery mode is set we keep showing Restore Access across refreshes
    // until the user finishes (or abandons) the reset.
    if (arrivedFromPasswordReset) setRecoveryMode(true)
    const inRecovery = arrivedFromPasswordReset || recoveryModeActive()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        setStage(inRecovery ? 'recovery-reset' : 'lock')
      } else if (inRecovery) {
        // Recovery session not established yet. PASSWORD_RECOVERY (or SIGNED_IN)
        // in onAuthStateChange will route us the moment it fires.
        setStage('loading')
      } else {
        setStage('auth')
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // PASSWORD_RECOVERY fires when the user lands on the page from a reset
      // email link. The session is established but only valid for changing
      // the password — divert to the Restore Access screen.
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        setRecoveryMode(true)
        setUser(session.user)
        setStage('recovery-reset')
        return
      }
      if (!session?.user) {
        dekRef.current = null
        saltRef.current = null
        setUser(null)
        setInitialData(null)
        setAvatar(null)
        setStage('auth')
      } else {
        // USER_UPDATED carries fresh metadata (name/avatar/email changes) —
        // always take the new object then. Otherwise keep the previous
        // reference for same-user events (e.g. TOKEN_REFRESHED) to avoid
        // re-render churn.
        setUser(prev => (prev?.id === session.user.id && event !== 'USER_UPDATED') ? prev : session.user)
        // If we're mid-reset, the SIGNED_IN event for that session also fires
        // here. Stay on the Restore Access screen.
        if (arrivedFromPasswordReset || recoveryModeActive()) {
          setStage(prev => prev === 'recovery-reset' || prev === 'loading' ? 'recovery-reset' : prev)
        }
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

  const signUp = useCallback(async (email, password, { firstName, lastName } = {}) => {
    setError(null)
    // The name rides along in auth user metadata — it's the one piece of
    // profile data that lives outside the encrypted vault, so the UI can
    // show it before unlock.
    const displayName = [firstName, lastName].filter(Boolean).join(' ')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: displayName
        ? { data: { display_name: displayName, first_name: firstName, last_name: lastName } }
        : undefined,
    })
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
    setAvatar(null)
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
        setAvatar(null)
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
      setAvatar(row.avatar ?? null)
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
    setRecoveryMode(false)
    await supabase.auth.signOut()
  }, [])

  // Triggers Supabase's hosted email reset. The user clicks the link in the
  // email, comes back to this page in the 'recovery-reset' stage where they
  // pick a new password. After that they're signed in but the vault is still
  // encrypted with their OLD key — they then use the recovery phrase to
  // relink, or destroy the vault and start over.
  const requestPasswordReset = useCallback(async (email) => {
    if (!email) return { ok: false, error: 'Email is required.' }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [])

  // After PASSWORD_RECOVERY: unwrap the DEK with the user's old password OR
  // recovery phrase, set the new auth password, and re-wrap the DEK so the
  // new password becomes the unlock password. This converges auth and vault
  // back to a single password instead of leaving them split.
  const restoreAccess = useCallback(async (
    { oldPassword, recoveryPhrase, newPassword },
  ) => {
    if (!user) return { ok: false, error: 'No active session.' }
    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: 'New password must be at least 8 characters.' }
    }
    if (!oldPassword && !recoveryPhrase) {
      return { ok: false, error: 'Enter your old password or recovery phrase.' }
    }
    try {
      const row = await fetchVault(user.id)
      if (!row?.wrapped_dek) {
        return { ok: false, error: 'No vault found for this account.' }
      }
      let dek
      if (oldPassword) {
        const oldKek = await deriveKey(oldPassword, row.salt)
        try {
          dek = await unwrapDEK(row.wrapped_dek, row.wrapped_dek_iv, oldKek)
        } catch {
          return { ok: false, error: 'Old password is incorrect.' }
        }
      } else {
        if (!row.wrapped_dek_recovery || !row.recovery_salt) {
          return { ok: false, error: 'No recovery phrase has been set on this account.' }
        }
        const normalized = normalizeRecoveryPhrase(recoveryPhrase)
        if (normalized.length < 32) {
          return { ok: false, error: 'Recovery phrase looks incomplete.' }
        }
        const recoveryKek = await deriveKey(normalized, row.recovery_salt)
        try {
          dek = await unwrapDEK(row.wrapped_dek_recovery, row.wrapped_dek_recovery_iv, recoveryKek)
        } catch {
          return { ok: false, error: 'Recovery phrase is incorrect.' }
        }
      }
      // Now set the new auth password — we're still in the recovery session.
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) return { ok: false, error: updateErr.message }
      // Re-wrap the DEK with the new password's KEK.
      saltRef.current = row.salt
      const newKek = await deriveKey(newPassword, row.salt)
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
      setAvatar(row.avatar ?? null)
      try { window.history.replaceState(null, '', window.location.pathname) } catch {}
      setRecoveryMode(false)
      setStage('unlock')
      return { ok: true }
    } catch {
      return { ok: false, error: 'Could not restore access. Try again.' }
    }
  }, [user])

  // Forgot-password escape hatch (no UI caller currently — kept for completeness).
  const resetVault = useCallback(async () => {
    if (!user) return
    try { await supabase.from('vaults').delete().eq('user_id', user.id) } catch {}
    try { localStorage.removeItem(SALT_CACHE_KEY) } catch {}
    try { localStorage.removeItem('networth_v1') } catch {}
    dekRef.current = null
    saltRef.current = null
    setInitialData(null)
    setRecoveryMode(false)
    await supabase.auth.signOut()
  }, [user])

  // In-app full account deletion. Requires the current password right now —
  // proving it's the legitimate user and not someone who only has email
  // access. Calls a Supabase Edge Function that uses the service-role key
  // to delete the auth user; the ON DELETE CASCADE on vaults removes the
  // encrypted row in the same transaction. After this, the email is freed
  // up to sign up again from scratch.
  const deleteAccount = useCallback(async (currentPassword) => {
    if (!user || !saltRef.current) return { ok: false, error: 'Not signed in.' }
    if (!currentPassword) return { ok: false, error: 'Password required to confirm.' }
    try {
      // Verify password locally before invoking the edge function.
      const kek = await deriveKey(currentPassword, saltRef.current)
      const row = await fetchVault(user.id)
      if (!row?.wrapped_dek) return { ok: false, error: 'Vault not found.' }
      try {
        await unwrapDEK(row.wrapped_dek, row.wrapped_dek_iv, kek)
      } catch {
        return { ok: false, error: 'Password is incorrect.' }
      }
      // Invoke the edge function — it verifies the JWT server-side and uses
      // the service-role key to delete the auth user (cascading the vault row).
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
      if (error) {
        return { ok: false, error: 'Could not delete account: ' + (error.message || 'edge function not deployed?') }
      }
      try { localStorage.removeItem(SALT_CACHE_KEY) } catch {}
      try { localStorage.removeItem('networth_v1') } catch {}
      dekRef.current = null
      saltRef.current = null
      setInitialData(null)
      setRecoveryMode(false)
      // Local sign-out — the server session is already invalid since the user is gone.
      try { await supabase.auth.signOut() } catch {}
      return { ok: true }
    } catch {
      return { ok: false, error: 'Could not delete account. Try again.' }
    }
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

  // Update the profile: the name lives in auth user metadata (tiny, and the
  // UI can show it before unlock); the avatar photo goes to the vaults row
  // via pushAvatar. Never put the photo in metadata — metadata is embedded
  // in every access token, and a data-URL there bloats the JWT past gateway
  // header limits, hanging fresh sign-ins. `avatar: null` in the metadata
  // write also scrubs any copy left by builds that got this wrong.
  const updateProfile = useCallback(async ({ firstName, lastName, avatar: nextAvatar }) => {
    if (!user) return { ok: false, error: 'Not signed in.' }
    const displayName = [firstName, lastName].filter(Boolean).join(' ')
    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
        avatar: null,
      },
    })
    if (error) return { ok: false, error: error.message }
    // The USER_UPDATED auth event also lands here, but apply the fresh user
    // object immediately so the UI doesn't wait on the event loop.
    if (data?.user) setUser(data.user)
    try {
      await pushAvatar(user.id, nextAvatar)
    } catch (e) {
      return { ok: false, error: 'Could not save the photo: ' + (e?.message || 'try again.') }
    }
    setAvatar(nextAvatar || null)
    return { ok: true }
  }, [user])

  // Change the sign-in email. Supabase (with secure email change on) sends
  // confirmation links to BOTH addresses; user.email only flips after both
  // are clicked, so callers should message "check your inbox" rather than
  // assume the change is live. The vault is untouched — email is only an
  // auth identifier, not key material.
  const updateEmail = useCallback(async (newEmail) => {
    if (!user) return { ok: false, error: 'Not signed in.' }
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
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
      setAvatar(row.avatar ?? null)
      setStage('unlock')
      return { ok: true }
    } catch {
      return { ok: false, error: 'Recovery failed. Try again.' }
    }
  }, [user])

  // One-time repair for accounts whose avatar was saved into auth user
  // metadata by earlier builds: once unlocked (i.e. this session's token
  // still works), copy the photo into the vaults row and scrub it from
  // metadata so freshly issued tokens shrink back to normal and new
  // sign-ins stop hanging on oversized JWTs.
  const migratedAvatarRef = useRef(false)
  useEffect(() => {
    const metaAvatar = user?.user_metadata?.avatar
    if (stage !== 'unlock' || !metaAvatar || migratedAvatarRef.current) return
    migratedAvatarRef.current = true
    ;(async () => {
      try {
        await pushAvatar(user.id, metaAvatar)
        setAvatar(metaAvatar)
      } catch {
        // Column not migrated yet — still scrub the metadata below; a lost
        // photo is recoverable, a bricked sign-in is worse.
      }
      try {
        const { data } = await supabase.auth.updateUser({ data: { avatar: null } })
        if (data?.user) setUser(data.user)
      } catch {}
    })()
  }, [stage, user])

  const clearPendingRecoveryPhrase = useCallback(() => setPendingRecoveryPhrase(null), [])

  return {
    stage, user, error, initialData, avatar,
    pendingRecoveryPhrase, clearPendingRecoveryPhrase,
    signUp, signIn, unlock, signOut, resetVault, deleteAccount, changePassword,
    updateProfile, updateEmail,
    generateRecovery, unlockWithRecovery,
    requestPasswordReset, restoreAccess,
    pushData,
  }
}
