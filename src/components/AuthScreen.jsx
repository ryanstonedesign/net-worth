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
          We sent a password reset link to <strong>{email}</strong>.
        </p>
          <p style={{ marginTop: 20, fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>
            What happens next
          </p>
          <ol style={{
            paddingLeft: 20, marginTop: 8, marginBottom: 0,
            fontSize: 13, lineHeight: 1.7, color: 'var(--c-ink-mute)',
          }}>
            <li>Click the link in your email.</li>
            <li>Unlock with your old password or recovery phrase.</li>
            <li>Set a new password.</li>
          </ol>
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

export default function AuthScreen({ onSignIn, onSignUp, onForgotPassword, onBack, error, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode) // 'signin' | 'signup' | 'forgot'
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [ack, setAck] = useState(false)

  const passwordsMatch = password === confirmPassword
  const showMismatch = mode === 'signup' && confirmPassword.length > 0 && !passwordsMatch
  const nameComplete = Boolean(firstName.trim() && lastName.trim())

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    if (mode === 'signup' && (!nameComplete || !ack || !passwordsMatch)) return
    setBusy(true)
    try {
      if (mode === 'signin') await onSignIn(email.trim(), password)
      else await onSignUp(email.trim(), password, { firstName: firstName.trim(), lastName: lastName.trim() })
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
        <div className="auth-eyebrow">Worthfolio</div>
        <h1 className="auth-title">
          {mode === 'signin' ? 'Welcome back' : 'Create your vault'}
        </h1>
        <p className="auth-sub">
          {mode === 'signin'
            ? 'Sign in to sync your encrypted data across devices.'
            : 'Your data is encrypted on this device before it leaves. Nobody but you can read it.'}
        </p>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First name</label>
                <input
                  className="input"
                  type="text"
                  autoComplete="given-name"
                  maxLength={40}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last name</label>
                <input
                  className="input"
                  type="text"
                  autoComplete="family-name"
                  maxLength={40}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
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
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              {showMismatch && (
                <div className="auth-error">Passwords don't match.</div>
              )}
            </div>
          )}

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
            disabled={busy || !email.trim() || !password || (mode === 'signup' && (!nameComplete || !ack || !passwordsMatch))}
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
        {onBack && (
          <button className="auth-switch" onClick={onBack}>← Back to home</button>
        )}
      </div>
    </div>
  )
}
