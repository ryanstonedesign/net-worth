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
}) {
  const isNew = !category
  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState(category?.type ?? 'asset')
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0])
  const [icon, setIcon] = useState(category?.icon ?? CATEGORY_ICONS[0])
  const [newAccName, setNewAccName] = useState('')
  const [localAccounts, setLocalAccounts] = useState([])
  // Track edited names for existing accounts before blur-save
  const [nameEdits, setNameEdits] = useState(() =>
    Object.fromEntries((category?.accounts ?? []).map(a => [a.id, a.name]))
  )
  const accInputRef = useRef(null)

  const handleAddLocalAcc = () => {
    const n = newAccName.trim()
    if (!n) return
    setLocalAccounts(a => [...a, { id: `tmp_${Date.now()}`, name: n }])
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
    onSave({ name: name.trim(), type, color, icon }, localAccounts)
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
      </div>

      <div className="form-group">
        <label className="form-label">Color</label>
        <div className="swatch-row">
          {CATEGORY_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`swatch${color === c ? ' active' : ''}`}
              style={{ background: c, color: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 24 }}>
        <label className="form-label">Icon</label>
        <div className="icon-row">
          {CATEGORY_ICONS.map(ic => (
            <button
              key={ic}
              type="button"
              className={`icon-btn${icon === ic ? ' active' : ''}`}
              onClick={() => setIcon(ic)}
            >
              {ic}
            </button>
          ))}
        </div>
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
