import { useState } from 'react'

export default function AuthScreen({ onSignIn, onSignUp, error }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [ack, setAck] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    if (mode === 'signup' && !ack) return
    setBusy(true)
    try {
      if (mode === 'signin') await onSignIn(email.trim(), password)
      else await onSignUp(email.trim(), password)
    } finally { setBusy(false) }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-eyebrow">Net Worth</div>
        <h1 className="auth-title">
          {mode === 'signin' ? 'Welcome back' : 'Create your vault'}
        </h1>
        <p className="auth-sub">
          {mode === 'signin'
            ? 'Sign in to sync your encrypted data across devices.'
            : 'Your data is encrypted on this device before it leaves. Nobody but you can read it.'}
        </p>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="input"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {mode === 'signup' && (
            <label className="auth-warn">
              <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />
              <span>
                I understand: if I forget this password, my data is
                <strong> permanently unrecoverable</strong>. Nobody — not even
                support — can decrypt it.
              </span>
            </label>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={busy || !email.trim() || !password || (mode === 'signup' && !ack)}
          >
            {busy ? 'Working…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Need an account? Create one' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
