import { supabase } from './supabase'
import { encryptJSON, decryptJSON } from './crypto'

// One row per user holds the entire encrypted vault. Last-write-wins via version.
const TABLE = 'vaults'

const COLUMNS = [
  'ciphertext', 'iv', 'salt', 'version',
  'wrapped_dek', 'wrapped_dek_iv',
  'wrapped_dek_recovery', 'wrapped_dek_recovery_iv', 'recovery_salt',
].join(', ')

export async function fetchVault(userId) {
  const { data, error } = await supabase
    .from(TABLE).select(COLUMNS).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchSalt(userId) {
  const { data, error } = await supabase
    .from(TABLE).select('salt').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.salt ?? null
}

export async function pushVault({
  userId, dek, salt, data, version,
  wrappedDek, wrappedDekIv,
  wrappedDekRecovery, wrappedDekRecoveryIv, recoverySalt,
}) {
  const { ciphertext, iv } = await encryptJSON(dek, data)
  const row = {
    user_id: userId, ciphertext, iv, salt, version,
    wrapped_dek: wrappedDek, wrapped_dek_iv: wrappedDekIv,
  }
  // Only include recovery columns if provided — preserves existing values
  // when the caller isn't touching recovery.
  if (wrappedDekRecovery !== undefined) row.wrapped_dek_recovery = wrappedDekRecovery
  if (wrappedDekRecoveryIv !== undefined) row.wrapped_dek_recovery_iv = wrappedDekRecoveryIv
  if (recoverySalt !== undefined) row.recovery_salt = recoverySalt

  const { error } = await supabase
    .from(TABLE).upsert(row, { onConflict: 'user_id' })
  if (error) throw error
}

// Push only the wrapping fields (no plaintext changes). Used by change-password
// and add-recovery flows where the ciphertext doesn't need to change.
export async function pushWrappingChange({
  userId, version, salt,
  wrappedDek, wrappedDekIv,
  wrappedDekRecovery, wrappedDekRecoveryIv, recoverySalt,
  ciphertext, iv,
}) {
  const row = {
    user_id: userId, ciphertext, iv, salt, version,
    wrapped_dek: wrappedDek, wrapped_dek_iv: wrappedDekIv,
  }
  if (wrappedDekRecovery !== undefined) row.wrapped_dek_recovery = wrappedDekRecovery
  if (wrappedDekRecoveryIv !== undefined) row.wrapped_dek_recovery_iv = wrappedDekRecoveryIv
  if (recoverySalt !== undefined) row.recovery_salt = recoverySalt
  const { error } = await supabase
    .from(TABLE).upsert(row, { onConflict: 'user_id' })
  if (error) throw error
}

export { decryptJSON, encryptJSON }
