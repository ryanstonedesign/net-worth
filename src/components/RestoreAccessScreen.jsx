import { useState } from 'react'
import RecoveryPhraseInput from './RecoveryPhraseInput'

export default function RestoreAccessScreen({ email, onRestore, onSignOut }) {
  const [mode, setMode] = useState('password') // 'password' | 'recovery'
  const [oldPassword, setOldPassword] = useState('')
  const [phrase, setPhrase] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

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
              <RecoveryPhraseInput value={phrase} onChange={setPhrase} required autoFocus />
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
            {busy ? 'Restoring…' : 'Set password and unlock'}
          </button>
        </form>

        <button className="auth-switch" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  )
}

