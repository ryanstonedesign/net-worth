import { useRef, useState } from 'react'
import Modal from './Modal'

// Downscale a picked image to a small square JPEG data URL. Avatars ride
// along in Supabase auth user metadata (like the display name) so they're
// available before the vault unlocks — that only works if they stay tiny,
// hence the hard 128px cap.
const AVATAR_SIZE = 128

// Formats every browser can decode. Deliberately NOT image/* — when the
// accept list excludes HEIC, iOS transcodes High Efficiency photos (the
// camera default, including Live Photos) to JPEG at pick time. With
// image/* it hands over the raw HEIC, which most browsers can't decode.
const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

// Prefer createImageBitmap (applies EXIF orientation, so portrait iPhone
// shots come out upright); fall back to an <img> element where it's missing
// or rejects the file.
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {}
    try {
      return await createImageBitmap(file)
    } catch {}
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('undecodable')) }
    img.src = url
  })
}

async function fileToAvatarDataURL(file) {
  let source
  try {
    source = await decodeImage(file)
  } catch {
    throw new Error('That photo format isn’t supported here — try a JPEG or PNG.')
  }
  const width = source.naturalWidth || source.width
  const height = source.naturalHeight || source.height
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  // Center-crop the shorter side so any aspect ratio fills the circle.
  const side = Math.min(width, height)
  const sx = (width - side) / 2
  const sy = (height - side) / 2
  ctx.fillStyle = '#fff' // JPEG has no alpha — transparent PNGs get white
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
  ctx.drawImage(source, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  source.close?.()
  return canvas.toDataURL('image/jpeg', 0.85)
}

function ChangePasswordView({ onSubmit, onDone, onCancel }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!current || !next || !confirm) return
    if (next !== confirm) { setError('New passwords don\'t match.'); return }
    if (next.length < 8) { setError('New password must be at least 8 characters.'); return }
    setBusy(true)
    setError(null)
    const result = await onSubmit({ currentPassword: current, newPassword: next })
    setBusy(false)
    if (result.ok) setDone(true)
    else setError(result.error)
  }

  if (done) {
    return (
      <>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--c-ink)' }}>
          Your password has been changed. Save the new one somewhere safe.
        </p>
        <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={onDone}>
          Done
        </button>
      </>
    )
  }

  return (
    <form onSubmit={submit}>
      <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', marginBottom: 16, lineHeight: 1.5 }}>
        Your vault will be re-encrypted with the new password. There is still no
        recovery if you forget — save it somewhere safe.
      </p>
      <div className="form-group">
        <label className="form-label">Current password</label>
        <input
          className="input" type="password" autoComplete="current-password"
          value={current} onChange={e => setCurrent(e.target.value)} required
        />
      </div>
      <div className="form-group">
        <label className="form-label">New password</label>
        <input
          className="input" type="password" autoComplete="new-password"
          minLength={8}
          value={next} onChange={e => setNext(e.target.value)} required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Confirm new password</label>
        <input
          className="input" type="password" autoComplete="new-password"
          minLength={8}
          value={confirm} onChange={e => setConfirm(e.target.value)} required
        />
      </div>
      {error && <div className="auth-error">{error}</div>}
      <button
        type="submit" className="btn btn-primary btn-full"
        disabled={busy || !current || !next || !confirm}
      >
        {busy ? 'Changing…' : 'Change password'}
      </button>
      <button type="button" className="auth-switch" onClick={onCancel}>
        Cancel
      </button>
    </form>
  )
}

// Account settings: avatar (uploaded photo or initials), name, email, and
// password. Opened only from the user popover in the side nav footer;
// landing on the app with #account in the URL deep-links straight here.
//
// Name + avatar changes apply on Save via `onUpdateProfile`. An email change
// goes through `onUpdateEmail`, which triggers Supabase's double-confirmation
// emails — the address only actually switches once both links are clicked,
// so we show a "check your inbox" view instead of closing.
export default function AccountModal({
  user, onClose, onUpdateProfile, onUpdateEmail, onChangePassword,
}) {
  const meta = user?.user_metadata || {}
  // Older accounts may only carry display_name (or nothing) — split it as a
  // best-effort prefill so the fields aren't empty for them.
  const [fallbackFirst, ...fallbackRest] = (meta.display_name || '').split(' ')
  const [firstName, setFirstName] = useState(meta.first_name ?? fallbackFirst ?? '')
  const [lastName, setLastName] = useState(meta.last_name ?? fallbackRest.join(' '))
  const [email, setEmail] = useState(user?.email || '')
  const [avatar, setAvatar] = useState(meta.avatar || null)
  const [view, setView] = useState('main') // 'main' | 'password' | 'email-sent'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const profileDirty = firstName.trim() !== (meta.first_name ?? fallbackFirst ?? '')
    || lastName.trim() !== (meta.last_name ?? fallbackRest.join(' '))
    || (avatar || null) !== (meta.avatar || null)
  const emailDirty = email.trim().toLowerCase() !== (user?.email || '').toLowerCase()
  const canSave = (profileDirty || emailDirty) && firstName.trim() && email.trim()

  const initials = ((firstName.trim().charAt(0) + lastName.trim().charAt(0))
    || user?.email?.charAt(0) || '?').toUpperCase()

  const pickPhoto = async (file) => {
    if (!file) return
    setError(null)
    try {
      setAvatar(await fileToAvatarDataURL(file))
    } catch (e) {
      setError(e.message)
    }
  }

  const save = async () => {
    if (!canSave || busy) return
    setBusy(true)
    setError(null)
    if (profileDirty) {
      const result = await onUpdateProfile({
        firstName: firstName.trim(), lastName: lastName.trim(), avatar,
      })
      if (!result.ok) { setError(result.error); setBusy(false); return }
    }
    if (emailDirty) {
      const result = await onUpdateEmail(email.trim())
      setBusy(false)
      if (!result.ok) { setError(result.error); return }
      setView('email-sent')
      return
    }
    setBusy(false)
    onClose()
  }

  return (
    <Modal
      title={view === 'password' ? 'Change Password' : 'Account'}
      onClose={onClose}
      footer={view === 'main' ? (
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSave || busy} onClick={save}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      ) : undefined}
    >
      {view === 'main' && (
        <>
          <div className="account-avatar-row">
            <span className="account-avatar" aria-hidden="true">
              {avatar ? <img src={avatar} alt="" /> : initials}
            </span>
            <div className="account-avatar-actions">
              <button
                type="button" className="btn btn-secondary"
                onClick={() => fileRef.current?.click()}
              >
                {avatar ? 'Change photo' : 'Upload photo'}
              </button>
              {avatar && (
                <button type="button" className="account-avatar-remove" onClick={() => setAvatar(null)}>
                  Remove
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={AVATAR_ACCEPT}
                hidden
                onChange={e => { pickPhoto(e.target.files?.[0]); e.target.value = '' }}
              />
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', margin: '0 0 20px', lineHeight: 1.5 }}>
            Without a photo, your initials are shown.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="account-first-name">First name</label>
              <input
                id="account-first-name" className="input" type="text"
                autoComplete="given-name" maxLength={40}
                value={firstName} onChange={e => setFirstName(e.target.value)} required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="account-last-name">Last name</label>
              <input
                id="account-last-name" className="input" type="text"
                autoComplete="family-name" maxLength={40}
                value={lastName} onChange={e => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="account-email">Email</label>
            <input
              id="account-email" className="input" type="email"
              autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
            {emailDirty && (
              <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', margin: 0, lineHeight: 1.5 }}>
                We'll send confirmation links to both your current and new
                address. The change applies once you've clicked both.
              </p>
            )}
          </div>

          {onChangePassword && (
            <div className="form-group" style={{ marginTop: 20 }}>
              <label className="form-label">Password</label>
              <button
                type="button" className="btn btn-secondary btn-full"
                onClick={() => setView('password')}
              >
                Change password
              </button>
            </div>
          )}

          {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
        </>
      )}

      {view === 'password' && (
        <ChangePasswordView
          onSubmit={onChangePassword}
          onDone={() => setView('main')}
          onCancel={() => setView('main')}
        />
      )}

      {view === 'email-sent' && (
        <>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--c-ink)' }}>
            Check your inbox — we sent confirmation links to both{' '}
            <strong>{user?.email}</strong> and <strong>{email.trim()}</strong>.
            Your email changes once you've clicked both. Until then you keep
            signing in with your current one.
          </p>
          <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={onClose}>
            Done
          </button>
        </>
      )}
    </Modal>
  )
}
