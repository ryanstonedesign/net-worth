import { useState } from 'react'
import Modal from './Modal'
import ImportSheet from './ImportSheet'
import { formatRecoveryPhrase } from '../lib/crypto'

export const SCENARIOS = [
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
        {busy ? 'Changing…' : 'Change password'}
      </button>
      <button
        type="button" className="auth-switch" onClick={onCancel}
      >
        Cancel
      </button>
    </form>
  )
}

function DeleteAccountForm({ onSubmit, onCancel }) {
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const canSubmit = password && confirmText === 'DELETE'

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true); setError(null)
    const result = await onSubmit(password)
    setBusy(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <form onSubmit={submit}>
      <p style={{
        fontSize: 13, color: 'var(--c-ink)', lineHeight: 1.5, marginBottom: 14,
      }}>
        This <strong style={{ color: 'var(--c-danger)' }}>permanently deletes</strong>{' '}
        your account: email, password, encrypted data — everything. The email
        becomes available to sign up again as a fresh account. There is no undo.
      </p>
      <div className="form-group">
        <label className="form-label">Confirm with your password</label>
        <input
          className="input" type="password" autoComplete="current-password"
          value={password} onChange={e => setPassword(e.target.value)} required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Type DELETE to confirm</label>
        <input
          className="input" type="text" autoCapitalize="characters" autoCorrect="off"
          spellCheck={false} value={confirmText}
          onChange={e => setConfirmText(e.target.value.toUpperCase())} required
        />
      </div>
      {error && <div className="auth-error">{error}</div>}
      <button
        type="submit" className="btn btn-full"
        style={{ background: 'var(--c-danger)', color: '#fff' }}
        disabled={busy || !canSubmit}
      >
        {busy ? 'Deleting…' : 'Delete account'}
      </button>
      <button type="button" className="auth-switch" onClick={onCancel}>Cancel</button>
    </form>
  )
}

// `initialView` lets the desktop settings popover jump straight to a single
// flow ('import', 'change-password', 'recovery-confirm', 'delete') without
// going through the full settings list. Cancelling from a directly-opened
// flow closes the sheet instead of falling back to the list.
export default function PrototypeSettings({
  open, onClose, initialView = 'main',
  scenario, onScenarioChange, onSignOut, onChangePassword,
  onGenerateRecovery, onDeleteAccount,
  categories, selectedMonth, onImport, onOpenStickerSheet,
}) {
  const [view, setView] = useState(initialView)
  const [recoveryPhrase, setRecoveryPhrase] = useState(null)
  const [recoveryError, setRecoveryError] = useState(null)
  const [busy, setBusy] = useState(false)

  const close = () => {
    setView(initialView)
    setRecoveryPhrase(null); setRecoveryError(null)
    onClose?.()
  }
  const goBack = initialView === 'main' ? () => setView('main') : close

  const regenerateRecovery = async () => {
    setBusy(true); setRecoveryError(null)
    const result = await onGenerateRecovery()
    setBusy(false)
    if (result.ok) { setRecoveryPhrase(result.phrase); setView('recovery-shown') }
    else { setRecoveryError(result.error) }
  }

  if (!open) return null

  return (
    <>
      {open && view === 'import' && (
        <ImportSheet
          categories={categories || []}
          selectedMonth={selectedMonth}
          onImport={onImport}
          onClose={close}
        />
      )}

      {open && view !== 'import' && (
        <Modal
          title={
            view === 'change-password' ? 'Change Password'
            : view === 'changed' ? 'Password Changed'
            : view === 'delete' ? 'Delete Account'
            : view === 'recovery-confirm' || view === 'recovery-shown' ? 'Recovery Phrase'
            : 'Settings'
          }
          onClose={close}
        >
          {view === 'main' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="scenario-select">Mock data</label>
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
              </div>

              {onImport && (
                <>
                  <button
                    className="btn btn-secondary btn-full"
                    style={{ marginTop: 16 }}
                    disabled={scenario !== 'none'}
                    onClick={() => setView('import')}
                  >
                    Import data
                  </button>
                  {scenario !== 'none' && (
                    <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', marginTop: 8, lineHeight: 1.5 }}>
                      Switch Mock data to <strong style={{ color: 'var(--c-ink)' }}>None</strong> to
                      import into your own data.
                    </p>
                  )}
                </>
              )}

              {onOpenStickerSheet && (
                <button
                  className="btn btn-secondary btn-full"
                  style={{ marginTop: 16 }}
                  onClick={() => { onOpenStickerSheet(); close() }}
                >
                  Design system
                </button>
              )}

              {onChangePassword && (
                <button
                  className="btn btn-secondary btn-full"
                  style={{ marginTop: 16 }}
                  onClick={() => setView('change-password')}
                >
                  Change password
                </button>
              )}

              {onGenerateRecovery && (
                <button
                  className="btn btn-secondary btn-full"
                  style={{ marginTop: 8 }}
                  onClick={() => setView('recovery-confirm')}
                >
                  Show recovery phrase
                </button>
              )}

              {onSignOut && (
                <button
                  style={{
                    display: 'block', width: '100%', marginTop: 12, padding: '12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: 'var(--c-primary)',
                    fontFamily: 'var(--font)',
                  }}
                  onClick={() => { onSignOut(); close() }}
                >
                  Sign out
                </button>
              )}

              {onDeleteAccount && (
                <button
                  style={{
                    display: 'block', width: '100%', marginTop: 4, padding: '12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: 'var(--c-danger)',
                    fontFamily: 'var(--font)',
                  }}
                  onClick={() => setView('delete')}
                >
                  Delete account
                </button>
              )}
            </>
          )}

          {view === 'delete' && (
            <DeleteAccountForm
              onSubmit={onDeleteAccount}
              onCancel={goBack}
            />
          )}

          {view === 'change-password' && (
            <ChangePasswordForm
              onSubmit={async (args) => {
                const result = await onChangePassword(args)
                if (result.ok) setView('changed')
                return result
              }}
              onCancel={goBack}
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

          {view === 'recovery-confirm' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', lineHeight: 1.5 }}>
                Generating a new recovery phrase replaces the old one. Any
                previously saved copy will stop working. Continue?
              </p>
              {recoveryError && <div className="auth-error" style={{ marginTop: 10 }}>{recoveryError}</div>}
              <button
                className="btn btn-primary btn-full" style={{ marginTop: 16 }}
                disabled={busy} onClick={regenerateRecovery}
              >
                {busy ? 'Working…' : 'Generate new phrase'}
              </button>
              <button className="auth-switch" onClick={goBack}>Cancel</button>
            </>
          )}

          {view === 'recovery-shown' && recoveryPhrase && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', lineHeight: 1.5, marginBottom: 12 }}>
                Save this somewhere safe. We can't show it to you again.
              </p>
              <div className="recovery-phrase">{formatRecoveryPhrase(recoveryPhrase)}</div>
              <button
                className="btn btn-secondary btn-full" style={{ marginTop: 12 }}
                onClick={() => navigator.clipboard?.writeText(formatRecoveryPhrase(recoveryPhrase))}
              >
                Copy
              </button>
              <button
                className="btn btn-primary btn-full" style={{ marginTop: 8 }}
                onClick={close}
              >
                I've saved it
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
