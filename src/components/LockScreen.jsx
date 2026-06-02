import { useState } from 'react'

export default function LockScreen({ email, onUnlock, onSignOut, onResetVault, error }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!password) return
    setBusy(true)
    try { await onUnlock(password) } finally { setBusy(false) }
  }

  if (confirmReset) {
    return (
      <div className="auth-shell">
        <div className="auth-card card">
          <div className="auth-eyebrow" style={{ color: 'var(--c-danger)' }}>Destructive</div>
          <h1 className="auth-title">Reset your vault?</h1>
          <p className="auth-sub">
            This <strong>permanently deletes</strong> your encrypted data from the
            server. There is no recovery. Use this only if you've truly forgotten
            your password and accept that you're starting over from scratch.
          </p>
          <button
            className="btn btn-full"
            style={{ background: 'var(--c-danger)', color: '#fff', marginBottom: 8 }}
            onClick={() => { onResetVault() }}
          >
            Yes, delete everything and start over
          </button>
          <button className="auth-switch" onClick={() => setConfirmReset(false)}>
            Cancel
          </button>
        </div>
      </div>
    )
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
        {onResetVault && (
          <button
            className="auth-switch"
            style={{ color: 'var(--c-danger)' }}
            onClick={() => setConfirmReset(true)}
          >
            Forgot your password?
          </button>
        )}
      </div>
    </div>
  )
}
