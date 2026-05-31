import { useState } from 'react'

export default function LockScreen({ email, onUnlock, onSignOut, error }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!password) return
    setBusy(true)
    try { await onUnlock(password) } finally { setBusy(false) }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-eyebrow">Locked</div>
        <h1 className="auth-title">Enter your password</h1>
        <p className="auth-sub">
          {email ? `Signed in as ${email}. ` : ''}
          Your data is encrypted on this device — re-enter your password to unlock.
        </p>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-full" disabled={busy || !password}>
            {busy ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>

        <button className="auth-switch" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  )
}
