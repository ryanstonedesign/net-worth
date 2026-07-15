import { useState } from 'react'
import Modal from './Modal'
import ImportSheet from './ImportSheet'

export const SCENARIOS = [
  { value: 'none', label: 'None' },
  { value: 'firsttime', label: 'First time' },
  { value: '6month', label: '6 month' },
  { value: '1year', label: '1 year' },
]

// `initialView` lets the desktop settings popover jump straight to a single
// flow ('import') without going through the full settings list. (Password
// changes, the recovery phrase, and account deletion live in the Account
// modal, opened from the user popover.)
export default function PrototypeSettings({
  open, onClose, initialView = 'main',
  scenario, onScenarioChange, onSignOut,
  categories, selectedMonth, onImport, onOpenStickerSheet,
}) {
  const [view, setView] = useState(initialView)

  const close = () => {
    setView(initialView)
    onClose?.()
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
        <Modal title="Settings" onClose={close}>
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
            </>
          )}
        </Modal>
      )}
    </>
  )
}
