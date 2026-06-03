import { useState } from 'react'

export default function SetNewPasswordScreen({ email, onSubmit }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!password || !confirm) return
    if (password !== confirm) { setError("Passwords don't match."); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setBusy(true); setError(null)
    const result = await onSubmit(password)
    setBusy(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-eyebrow">Reset</div>
        <h1 className="auth-title">Set a new password</h1>
        <p className="auth-sub">
          {email ? `For ${email}. ` : ''}
          After this, you'll see the lock screen — use your recovery phrase
          there to unlock your existing vault with the new password.
        </p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">New password</label>
            <input
              className="input" type="password" autoComplete="new-password"
              minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <input
              className="input" type="password" autoComplete="new-password"
              minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={busy || !password || !confirm}>
            {busy ? 'Saving…' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
