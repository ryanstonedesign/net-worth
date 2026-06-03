import { useState } from 'react'

export default function RestoreAccessScreen({ email, onRestore, onAbandon }) {
  const [mode, setMode] = useState('password') // 'password' | 'recovery'
  const [oldPassword, setOldPassword] = useState('')
  const [phrase, setPhrase] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmAbandon, setConfirmAbandon] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirm) { setError("New passwords don't match."); return }
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return }
    setBusy(true); setError(null)
    const args = mode === 'password'
      ? { oldPassword, newPassword }
      : { recoveryPhrase: phrase, newPassword }
    const result = await onRestore(args)
    setBusy(false)
    if (!result.ok) setError(result.error)
  }

  if (confirmAbandon) {
    return (
      <div className="auth-shell">
        <div className="auth-card card">
          <div className="auth-eyebrow" style={{ color: 'var(--c-danger)' }}>Destructive</div>
          <h1 className="auth-title">Start over?</h1>
          <p className="auth-sub">
            Without your old password or recovery phrase, your existing data
            can't be decrypted. This will <strong>permanently delete</strong> it
            so you can start with an empty vault.
          </p>
          <button
            className="btn btn-full"
            style={{ background: 'var(--c-danger)', color: '#fff', marginBottom: 8 }}
            onClick={() => onAbandon()}
          >
            Delete data and start over
          </button>
          <button className="auth-switch" onClick={() => setConfirmAbandon(false)}>Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-eyebrow">Restore Access</div>
        <h1 className="auth-title">Unlock your vault</h1>
        <p className="auth-sub">
          {email ? `Signed in as ${email}. ` : ''}
          To use your existing data with a new password, prove it's you with
          your old password or your recovery phrase.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={`btn ${mode === 'password' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setMode('password')}
          >
            Old password
          </button>
          <button
            type="button"
            className={`btn ${mode === 'recovery' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setMode('recovery')}
          >
            Recovery phrase
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === 'password' ? (
            <div className="form-group">
              <label className="form-label">Old password</label>
              <input
                className="input" type="password" autoComplete="current-password"
                value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                required autoFocus
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Recovery phrase</label>
              <input
                className="input"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', letterSpacing: '0.04em' }}
                type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                placeholder="XXXX-XXXX-XXXX-XXXX-…"
                value={phrase} onChange={e => setPhrase(e.target.value)}
                required autoFocus
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">New password</label>
            <input
              className="input" type="password" autoComplete="new-password" minLength={8}
              value={newPassword} onChange={e => setNewPassword(e.target.value)} required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <input
              className="input" type="password" autoComplete="new-password" minLength={8}
              value={confirm} onChange={e => setConfirm(e.target.value)} required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={busy || !newPassword || !confirm || (mode === 'password' ? !oldPassword : !phrase)}
          >
            {busy ? 'Restoring…' : 'Set Password and Unlock'}
          </button>
        </form>

        <button
          className="auth-switch"
          style={{ color: 'var(--c-danger)' }}
          onClick={() => setConfirmAbandon(true)}
        >
          I don't have either — start fresh
        </button>
      </div>
    </div>
  )
}
