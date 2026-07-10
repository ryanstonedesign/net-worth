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
        <div className="scenario-pick-list">
          {scenarios.map(s => (
            <label key={s.id} className="checkbox-row">
              <input
                type="radio"
                name="scenario-source"
                className="checkbox-input"
                checked={fromId === s.id}
                onChange={() => setFromId(s.id)}
              />
              <span className="checkbox-label">{s.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 24 }}>
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
