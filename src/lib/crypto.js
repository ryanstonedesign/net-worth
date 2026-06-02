// Zero-knowledge crypto helpers. The derived key never leaves memory.
// PBKDF2(passphrase, salt) -> AES-GCM-256 KEK. The KEK wraps a separate
// random DEK that actually encrypts the vault — letting us change passwords
// (or add a recovery phrase) without re-encrypting the data itself.

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

// Password → KEK. We add wrapKey/unwrapKey usages so this KEK can wrap a DEK.
export async function deriveKey(passphrase, saltB64) {
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  )
}

// Random extractable DEK. Extractable so it can be wrapped by KEKs.
export async function generateDEK() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: KEY_LENGTH }, true, ['encrypt', 'decrypt'],
  )
}

export async function wrapDEK(dek, kek) {
  const iv = new Uint8Array(IV_BYTES)
  crypto.getRandomValues(iv)
  const wrapped = await crypto.subtle.wrapKey(
    'raw', dek, kek, { name: 'AES-GCM', iv },
  )
  return { wrapped: bytesToB64(new Uint8Array(wrapped)), iv: bytesToB64(iv) }
}

export async function unwrapDEK(wrappedB64, ivB64, kek) {
  return crypto.subtle.unwrapKey(
    'raw',
    b64ToBytes(wrappedB64),
    kek,
    { name: 'AES-GCM', iv: b64ToBytes(ivB64) },
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
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

// Recovery phrase: 128 bits of entropy as 32 hex chars, displayed in groups
// of 4 separated by dashes. Plenty of entropy when fed through PBKDF2.
export function generateRecoveryPhrase() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

export function formatRecoveryPhrase(hex) {
  return (hex.match(/.{1,4}/g) || []).join('-').toUpperCase()
}

export function normalizeRecoveryPhrase(input) {
  return (input || '').replace(/[^a-f0-9]/gi, '').toLowerCase()
}
