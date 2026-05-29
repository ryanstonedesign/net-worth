import { useState } from 'react'
import Modal from './Modal'

const SCENARIOS = [
  { value: 'none', label: 'None' },
  { value: 'firsttime', label: 'First time' },
  { value: '6month', label: '6 month' },
  { value: '1year', label: '1 year' },
]

export default function PrototypeSettings({ scenario, onScenarioChange }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="settings-fab"
        aria-label="Prototype settings"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <Modal title="Prototype Settings" onClose={() => setOpen(false)}>
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
        </Modal>
      )}
    </>
  )
}
