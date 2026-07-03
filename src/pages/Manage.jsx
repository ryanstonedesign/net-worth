import { useState } from 'react'
import Modal from '../components/Modal'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../hooks/useData'

export default function Manage({ data, addCategory, updateCategory, deleteCategory, addAccount, deleteAccount }) {
  const [addCatOpen, setAddCatOpen] = useState(false)
  const [addAccOpen, setAddAccOpen] = useState(null) // categoryId

  return (
    <div>
      <div className="page-top">
        <div className="page-top-title">Manage</div>
        <button className="btn btn-primary btn-sm" onClick={() => setAddCatOpen(true)}>
          + Category
        </button>
      </div>

      <div className="section" style={{ marginTop: 8 }}>
        {data.categories.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 48 }}>
            <div className="empty-icon">🗂️</div>
            <div className="empty-title">No categories</div>
            <div className="empty-desc">Add a category like "Retirement" or "Account Balances" to get started.</div>
          </div>
        ) : (
          data.categories.map(cat => (
            <ManageCatCard
              key={cat.id}
              cat={cat}
              onDelete={() => {
                if (confirm(`Delete "${cat.name}" and all its accounts?`)) deleteCategory(cat.id)
              }}
              onDeleteAccount={(accId) => {
                if (confirm('Remove this account?')) deleteAccount(cat.id, accId)
              }}
              onAddAccount={() => setAddAccOpen(cat.id)}
            />
          ))
        )}
      </div>

      {addCatOpen && (
        <AddCategoryModal
          onClose={() => setAddCatOpen(false)}
          onSave={(cat) => { addCategory(cat); setAddCatOpen(false) }}
        />
      )}

      {addAccOpen && (
        <AddAccountModal
          categoryName={data.categories.find(c => c.id === addAccOpen)?.name}
          onClose={() => setAddAccOpen(null)}
          onSave={(acc) => { addAccount(addAccOpen, acc); setAddAccOpen(null) }}
        />
      )}
    </div>
  )
}

function ManageCatCard({ cat, onDelete, onDeleteAccount, onAddAccount }) {
  return (
    <div className="card manage-cat-card">
      <div className="manage-cat-header">
        <div className="manage-cat-icon" style={{ background: cat.color + '22' }}>
          {cat.icon}
        </div>
        <div className="manage-cat-info">
          <div className="manage-cat-name">{cat.name}</div>
          <div className="manage-cat-meta">
            <span className={`badge badge-${cat.type}`}>
              {cat.type === 'liability' ? 'Liability' : 'Asset'}
            </span>
            <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--c-ink-mute)' }}>
              · {cat.accounts.length} account{cat.accounts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button className="del-btn" onClick={onDelete} title="Delete category">×</button>
      </div>

      <div className="manage-account-list">
        {cat.accounts.map(acc => (
          <div key={acc.id} className="manage-account-row">
            <div className="manage-account-name">{acc.name}</div>
            <button className="del-btn" onClick={() => onDeleteAccount(acc.id)} title="Remove">×</button>
          </div>
        ))}
        <button
          className="btn btn-tertiary btn-sm"
          style={{ marginTop: 10 }}
          onClick={onAddAccount}
        >
          + Add Account
        </button>
      </div>
    </div>
  )
}

function AddCategoryModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('asset')
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [icon, setIcon] = useState(CATEGORY_ICONS[0])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), type, color, icon })
  }

  return (
    <Modal title="New Category" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            className="input"
            placeholder="e.g. Retirement"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Type</label>
          <div className="type-toggle" data-pos={type === 'liability' ? 1 : 0}>
            <span className="type-toggle-thumb" aria-hidden="true" />
            <button
              type="button"
              className={`type-toggle-btn${type === 'asset' ? ' active' : ''}`}
              onClick={() => setType('asset')}
            >Asset</button>
            <button
              type="button"
              className={`type-toggle-btn${type === 'liability' ? ' active' : ''}`}
              onClick={() => setType('liability')}
            >Liability</button>
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

        <div className="form-group">
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

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!name.trim()}>
            Add Category
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AddAccountModal({ categoryName, onClose, onSave }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim() })
  }

  return (
    <Modal title={`Add to ${categoryName}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Account Name</label>
          <input
            className="input"
            placeholder="e.g. Wells Fargo Checking"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!name.trim()}>
            Add Account
          </button>
        </div>
      </form>
    </Modal>
  )
}
