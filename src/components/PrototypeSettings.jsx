import { useState } from 'react'
import Modal from './Modal'

const SCENARIOS = [
  { value: 'none', label: 'None' },
  { value: 'firsttime', label: 'First time' },
  { value: '6month', label: '6 month' },
  { value: '1year', label: '1 year' },
]

function ChangePasswordForm({ onSubmit, onCancel }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!current || !next || !confirm) return
    if (next !== confirm) { setError('New passwords don\'t match.'); return }
    if (next.length < 8) { setError('New password must be at least 8 characters.'); return }
    setBusy(true)
    setError(null)
    const result = await onSubmit({ currentPassword: current, newPassword: next })
    setBusy(false)
    if (!result.ok) setError(result.error)
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
        {busy ? 'Changing…' : 'Change Password'}
      </button>
      <button
        type="button" className="auth-switch" onClick={onCancel}
      >
        Cancel
      </button>
    </form>
  )
}

export default function PrototypeSettings({
  scenario, onScenarioChange, onSignOut, onChangePassword,
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('main') // 'main' | 'change-password' | 'changed'

  const close = () => { setOpen(false); setView('main') }

  return (
    <>
      <button
        className="settings-fab"
        aria-label="Settings"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <Modal
          title={
            view === 'change-password' ? 'Change Password'
            : view === 'changed' ? 'Password Changed'
            : 'Settings'
          }
          onClose={close}
        >
          {view === 'main' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="scenario-select">Scenario</label>
                <div className="select-wrap">
                  <select
                    id="scenario-select"
                    className="select"
                    value={scenario}
                    onChange={e => onScenarioChange(e.target.value)}
                  >
                    {SCENARIOS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', marginTop: 10, lineHeight: 1.5 }}>
                  Preview demo datasets. <strong style={{ color: 'var(--c-ink)' }}>None</strong> always
                  shows your own saved data and is never overwritten.
                </p>
              </div>

              {onChangePassword && (
                <button
                  className="btn btn-secondary btn-full"
                  style={{ marginTop: 16 }}
                  onClick={() => setView('change-password')}
                >
                  Change Password
                </button>
              )}

              {onSignOut && (
                <button
                  style={{
                    display: 'block', width: '100%', marginTop: 12, padding: '12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: 'var(--c-danger)',
                    fontFamily: 'var(--font)',
                  }}
                  onClick={() => { onSignOut(); close() }}
                >
                  Sign Out
                </button>
              )}
            </>
          )}

          {view === 'change-password' && (
            <ChangePasswordForm
              onSubmit={async (args) => {
                const result = await onChangePassword(args)
                if (result.ok) setView('changed')
                return result
              }}
              onCancel={() => setView('main')}
            />
          )}

          {view === 'changed' && (
            <>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--c-ink)' }}>
                Your password has been changed. Save the new one somewhere safe.
              </p>
              <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={close}>
                Done
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
