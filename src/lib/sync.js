import { supabase } from './supabase'
import { encryptJSON, decryptJSON } from './crypto'

// One row per user holds the entire encrypted vault. Last-write-wins via version.
const TABLE = 'vaults'

export async function fetchVault(userId) {
  const { data, error } = await supabase
    .from(TABLE).select('ciphertext, iv, salt, version').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data // null if no row yet
}

export async function fetchSalt(userId) {
  const { data, error } = await supabase
    .from(TABLE).select('salt').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.salt ?? null
}

export async function pushVault({ userId, key, salt, data, version }) {
  const { ciphertext, iv } = await encryptJSON(key, data)
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, ciphertext, iv, salt, version }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function pullVault({ userId, key }) {
  const row = await fetchVault(userId)
  if (!row) return null
  const data = await decryptJSON(key, { ciphertext: row.ciphertext, iv: row.iv })
  return { data, version: row.version, salt: row.salt }
}
