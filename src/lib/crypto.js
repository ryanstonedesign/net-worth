// Zero-knowledge crypto helpers. The derived key never leaves memory.
// PBKDF2(passphrase, salt) -> AES-GCM-256 key. Ciphertext is the only thing
// that touches the network.

const PBKDF2_ITERATIONS = 600_000 // OWASP 2023+ guidance for SHA-256
const KEY_LENGTH = 256
const IV_BYTES = 12             // GCM standard
const SALT_BYTES = 16

const enc = new TextEncoder()
const dec = new TextDecoder()

function bytesToB64(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function b64ToBytes(b64) {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export function randomB64(bytes) {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return bytesToB64(buf)
}

export function newSalt() { return randomB64(SALT_BYTES) }

export async function deriveKey(passphrase, saltB64) {
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // non-extractable: key cannot be read out of WebCrypto
    ['encrypt', 'decrypt'],
  )
}

export async function encryptJSON(key, value) {
  const iv = new Uint8Array(IV_BYTES)
  crypto.getRandomValues(iv)
  const plaintext = enc.encode(JSON.stringify(value))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { ciphertext: bytesToB64(new Uint8Array(ct)), iv: bytesToB64(iv) }
}

export async function decryptJSON(key, { ciphertext, iv }) {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(iv) },
    key,
    b64ToBytes(ciphertext),
  )
  return JSON.parse(dec.decode(pt))
}
