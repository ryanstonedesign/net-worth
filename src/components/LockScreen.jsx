import { useState } from 'react'
import RecoveryPhraseInput from './RecoveryPhraseInput'

function RecoveryForm({ onSubmit, onCancel }) {
  const [phrase, setPhrase] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!phrase || !password) return
    setBusy(true); setError(null)
    const result = await onSubmit({ recoveryPhrase: phrase, currentPassword: password })
    setBusy(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-eyebrow">Recovery</div>
        <h1 className="auth-title">Recover with your phrase</h1>
        <p className="auth-sub">
          Enter the recovery phrase you saved at signup, plus your current
          password. We'll relink your vault to this password.
        </p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Recovery phrase</label>
            <RecoveryPhraseInput value={phrase} onChange={setPhrase} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Current password</label>
            <input
              className="input" type="password" autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={busy || !phrase || !password}>
            {busy ? 'Recovering…' : 'Recover'}
          </button>
        </form>
        <button className="auth-switch" onClick={onCancel}>Back</button>
      </div>
    </div>
  )
}

export default function LockScreen({
  email, onUnlock, onSignOut, onRecoveryUnlock, error,
}) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState('main') // 'main' | 'recovery'

  const submit = async (e) => {
    e.preventDefault()
    if (!password) return
    setBusy(true)
    try { await onUnlock(password) } finally { setBusy(false) }
  }

  if (view === 'recovery') {
    return <RecoveryForm onSubmit={onRecoveryUnlock} onCancel={() => setView('main')} />
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

        {onRecoveryUnlock && (
          <button className="auth-switch" onClick={() => setView('recovery')}>
            I have a recovery phrase
          </button>
        )}
        <button className="auth-switch" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  )
}
