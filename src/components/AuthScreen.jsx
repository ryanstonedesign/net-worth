import { useState } from 'react'

function ForgotPasswordView({ defaultEmail, onSubmit, onBack }) {
  const [email, setEmail] = useState(defaultEmail || '')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); setError(null)
    const result = await onSubmit(email.trim())
    setBusy(false)
    if (result.ok) setSent(true)
    else setError(result.error)
  }

  if (sent) {
    return (
      <div className="auth-shell">
        <div className="auth-card card">
          <div className="auth-eyebrow">Check your email</div>
          <h1 className="auth-title">Reset link sent</h1>
          <p className="auth-sub">
            We sent a password reset link to <strong>{email}</strong>. Click it,
            set a new password, then come back here.
          </p>
          <div style={{
            background: '#edf1f5', borderRadius: 12, padding: '14px 16px',
            fontSize: 13, lineHeight: 1.6, color: 'var(--c-ink)',
            boxShadow: 'var(--shadow-neu-in)', marginTop: 12,
          }}>
            <strong>What happens next:</strong>
            <ol style={{ paddingLeft: 18, marginTop: 8, marginBottom: 0 }}>
              <li>Click the link in your email.</li>
              <li>Set a new password.</li>
              <li>Sign back in here. You'll see the lock screen.</li>
              <li>Tap <strong>"I have a recovery phrase"</strong> and enter your
                  recovery phrase + new password to unlock your vault.</li>
            </ol>
            <p style={{ marginTop: 10, marginBottom: 0, color: 'var(--c-ink-mute)' }}>
              No recovery phrase? You'll be able to start fresh with a new vault,
              but old data can't be decrypted.
            </p>
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={onBack}>
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-eyebrow">Forgot password</div>
        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-sub">
          We'll email you a link to set a new password. To then unlock your
          existing data, you'll need either your recovery phrase or to start
          fresh.
        </p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="input" type="email" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={busy || !email.trim()}>
            {busy ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>
        <button className="auth-switch" onClick={onBack}>Back to Sign In</button>
      </div>
    </div>
  )
}

export default function AuthScreen({ onSignIn, onSignUp, onForgotPassword, error }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'
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

  if (mode === 'forgot') {
    return (
      <ForgotPasswordView
        defaultEmail={email}
        onSubmit={onForgotPassword}
        onBack={() => setMode('signin')}
      />
    )
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
                I understand: if I forget this password <strong>and</strong> lose
                my recovery phrase, my data is permanently unrecoverable.
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

        {mode === 'signin' && onForgotPassword && (
          <button className="auth-switch" onClick={() => setMode('forgot')}>
            Forgot password?
          </button>
        )}
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
