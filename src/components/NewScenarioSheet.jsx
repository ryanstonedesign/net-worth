import { useState } from 'react'
import Modal from './Modal'

// Entry point for creating a scenario: name it, pick which existing scenario
// to duplicate, and choose whether it stays synced with monthly updates
// (on by default — most people should never need to touch it).
export default function NewScenarioSheet({ scenarios, activeId, onCreate, onClose }) {
  const [name, setName] = useState('')
  const [fromId, setFromId] = useState(activeId)
  const [synced, setSynced] = useState(true)

  const create = () => onCreate({ name: name.trim() || 'New scenario', fromId, synced })

  return (
    <Modal title="New Scenario" onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Name</label>
        <input
          className="input"
          placeholder="e.g. Save More"
          value={name}
          maxLength={40}
          autoFocus
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') create() }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Duplicate From</label>
        <div className="select-wrap">
          <select
            className="input"
            value={fromId}
            onChange={e => setFromId(e.target.value)}
            aria-label="Scenario to duplicate from"
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <svg className="select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* 32 collapses with the form-group's 16 bottom margin → 32px gap. */}
      <div className="form-group" style={{ marginTop: 32, marginBottom: 24 }}>
        <div className="sync-toggle-row">
          <span className="sync-toggle-title">Sync monthly updates</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={synced}
              onChange={e => setSynced(e.target.checked)}
              aria-label="Sync monthly updates"
            />
            <span className="switch-track" />
            <span className="switch-thumb" />
          </label>
        </div>
        <p className="sync-explain">
          Synced scenarios share what actually happens. When you save a
          month's balances or contributions, every synced scenario gets the
          same numbers — while each keeps its own growth rates and future
          plans. Turn this off and this scenario keeps its own version of
          the past: your monthly updates won't touch it.
        </p>
      </div>

      <button className="btn btn-primary btn-full" onClick={create}>
        Create Scenario
      </button>
    </Modal>
  )
}
