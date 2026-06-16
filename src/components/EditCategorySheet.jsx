import { useState, useRef } from 'react'
import Modal from './Modal'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../hooks/useData'

export default function EditCategorySheet({
  category,
  onSave,
  onDelete,
  onClose,
  addAccount,
  deleteAccount,
  renameAccount,
  setAccountGrowth,
}) {
  const isNew = !category
  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState(category?.type ?? 'asset')
  const [contributing, setContributing] = useState(category?.contributing ?? false)
  // Color/icon are no longer user-editable, but kept in the data model.
  const color = category?.color ?? CATEGORY_COLORS[0]
  const icon = category?.icon ?? CATEGORY_ICONS[0]
  const [newAccName, setNewAccName] = useState('')
  const [localAccounts, setLocalAccounts] = useState([])
  // Track edited names for existing accounts before blur-save
  const [nameEdits, setNameEdits] = useState(() =>
    Object.fromEntries((category?.accounts ?? []).map(a => [a.id, a.name]))
  )
  // Track edited annual-growth values (as strings) before blur-save
  const [growthEdits, setGrowthEdits] = useState(() =>
    Object.fromEntries((category?.accounts ?? []).map(a => [a.id, String(a.growth ?? 0)]))
  )
  const accInputRef = useRef(null)

  const handleAddLocalAcc = () => {
    const n = newAccName.trim()
    if (!n) return
    setLocalAccounts(a => [...a, { id: `tmp_${Date.now()}`, name: n, growth: 0 }])
    setNewAccName('')
    accInputRef.current?.focus()
  }

  const handleAddAcc = () => {
    const n = newAccName.trim()
    if (!n) return
    addAccount(category.id, { name: n })
    setNewAccName('')
    accInputRef.current?.focus()
  }

  const handleSave = () => {
    if (!name.trim()) return
    const normalized = localAccounts.map(a => {
      const num = parseFloat(a.growth)
      return { ...a, growth: isNaN(num) ? 0 : num }
    })
    onSave({ name: name.trim(), type, color, icon, contributing }, normalized)
  }

  const accounts = isNew ? localAccounts : (category?.accounts ?? [])

  return (
    <Modal title={isNew ? 'New Category' : 'Edit Category'} onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Name</label>
        <input
          className="input"
          placeholder="e.g. Retirement"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Type</label>
        <div className="type-toggle">
          <button type="button" className={`type-toggle-btn${type === 'asset' ? ' active' : ''}`} onClick={() => setType('asset')}>Asset</button>
          <button type="button" className={`type-toggle-btn${type === 'liability' ? ' active' : ''}`} onClick={() => setType('liability')}>Liability</button>
        </div>
        <label className="checkbox-row" style={{ marginTop: 14 }}>
          <input
            type="checkbox"
            className="checkbox-input"
            checked={contributing}
            onChange={e => setContributing(e.target.checked)}
          />
          <span className="checkbox-label">Contributing monthly</span>
        </label>
      </div>

      {/* Accounts */}
      <div style={{ marginBottom: 24 }}>
        <div className="form-label" style={{ marginBottom: 8 }}>Accounts</div>

        {accounts.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(200,215,220,0.4)', marginBottom: 8 }}>
            {accounts.map(acc => (
              <div key={acc.id} className="manage-account-row">
                {isNew ? (
                  <input
                    className="manage-account-input"
                    value={acc.name}
                    onChange={e => setLocalAccounts(list =>
                      list.map(a => a.id === acc.id ? { ...a, name: e.target.value } : a)
                    )}
                  />
                ) : (
                  <input
                    className="manage-account-input"
                    value={nameEdits[acc.id] ?? acc.name}
                    onChange={e => setNameEdits(n => ({ ...n, [acc.id]: e.target.value }))}
                    onBlur={() => {
                      const next = (nameEdits[acc.id] ?? '').trim()
                      if (next && next !== acc.name) renameAccount(category.id, acc.id, next)
                      else setNameEdits(n => ({ ...n, [acc.id]: acc.name }))
                    }}
                  />
                )}
                {(() => {
                  const raw   = isNew ? String(acc.growth ?? 0) : (growthEdits[acc.id] ?? String(acc.growth ?? 0))
                  const isNeg = raw.trim().startsWith('-')
                  const mag   = raw.replace('-', '')
                  const commit = (next) => {
                    if (isNew) setLocalAccounts(list => list.map(a => a.id === acc.id ? { ...a, growth: next } : a))
                    else setGrowthEdits(g => ({ ...g, [acc.id]: next }))
                  }
                  return (
                    <div className="growth-field" title="Estimated annual growth — negative for depreciating assets. Used for future estimates.">
                      <button
                        type="button"
                        className="growth-sign"
                        aria-label={isNeg ? 'Make growth positive' : 'Make growth negative'}
                        onClick={() => {
                          const next = isNeg ? mag : '-' + mag
                          commit(next)
                          if (!isNew) {
                            const num = parseFloat(next)
                            setAccountGrowth(category.id, acc.id, isNaN(num) ? 0 : num)
                          }
                        }}
                      >{isNeg ? '−' : '+'}</button>
                      <input
                        className="growth-input"
                        inputMode="decimal"
                        value={mag}
                        onChange={e => {
                          const m = e.target.value.replace(/[^0-9.]/g, '')
                          commit((isNeg ? '-' : '') + m)
                        }}
                        onBlur={() => {
                          if (isNew) {
                            setLocalAccounts(list => list.map(a => {
                              if (a.id !== acc.id) return a
                              const num = parseFloat(a.growth)
                              return { ...a, growth: isNaN(num) ? 0 : num }
                            }))
                          } else {
                            const num = parseFloat(growthEdits[acc.id])
                            const clean = isNaN(num) ? 0 : num
                            setGrowthEdits(g => ({ ...g, [acc.id]: String(clean) }))
                            if (clean !== (acc.growth ?? 0)) setAccountGrowth(category.id, acc.id, clean)
                          }
                        }}
                      />
                      <span className="growth-suffix">%/yr</span>
                    </div>
                  )
                })()}
                <button
                  className="del-btn"
                  onClick={() => {
                    if (isNew) {
                      setLocalAccounts(a => a.filter(x => x.id !== acc.id))
                    } else {
                      deleteAccount(category.id, acc.id)
                    }
                  }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={accInputRef}
            className="input"
            style={{ fontSize: 16 }}
            placeholder="Account name"
            value={newAccName}
            onChange={e => setNewAccName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') isNew ? handleAddLocalAcc() : handleAddAcc() }}
          />
          <button
            className="btn btn-secondary btn-sm"
            style={{ flexShrink: 0 }}
            onClick={isNew ? handleAddLocalAcc : handleAddAcc}
            disabled={!newAccName.trim()}
          >
            Add
          </button>
        </div>
      </div>

      <button
        className="btn btn-primary btn-full"
        onClick={handleSave}
        disabled={!name.trim()}
      >
        {isNew ? 'Create Category' : 'Save Changes'}
      </button>

      {!isNew && (
        <button
          style={{
            display: 'block', width: '100%', marginTop: 12, padding: '12px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: 'var(--c-danger)',
            fontFamily: 'var(--font)',
          }}
          onClick={() => {
            if (confirm(`Delete "${category.name}" and all its accounts?`)) {
              onDelete()
              onClose()
            }
          }}
        >
          Delete Category
        </button>
      )}
    </Modal>
  )
}
