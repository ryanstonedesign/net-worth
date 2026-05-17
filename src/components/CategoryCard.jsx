import { useState, useCallback } from 'react'
import { formatCurrency, parseAmount } from '../utils'

export default function CategoryCard({ category, snapshot, onUpdate, onEdit }) {
  const [values, setValues] = useState(() => {
    const v = {}
    category.accounts.forEach(acc => {
      v[acc.id] = snapshot[acc.id] != null ? String(snapshot[acc.id]) : ''
    })
    return v
  })

  const total = category.accounts.reduce((s, a) => s + parseAmount(values[a.id] || '0'), 0)

  const handleBlur = useCallback(() => {
    const entries = {}
    category.accounts.forEach(acc => {
      if (values[acc.id] !== '') entries[acc.id] = parseAmount(values[acc.id])
    })
    onUpdate(entries)
  }, [values, category.accounts, onUpdate])

  return (
    <div className="card cat-card">
      {/* Header */}
      <div className="cat-card-header">
        <div className="cat-card-icon-wrap" style={{ background: category.color + '22' }}>
          {category.icon}
        </div>
        <div className="cat-card-body">
          <div className="cat-card-label">{category.name}</div>
          <div
            className="cat-card-amount"
            style={{ color: category.type === 'liability' ? 'var(--c-danger)' : 'var(--c-ink)' }}
          >
            {formatCurrency(total)}
          </div>
        </div>
        <button className="cat-card-edit" onClick={onEdit} title="Edit category">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
      </div>

      {/* Accounts */}
      {category.accounts.length > 0 ? (
        <div className="cat-accounts">
          {category.accounts.map(acc => (
            <div key={acc.id} className="cat-account-row">
              <span className="cat-account-name">{acc.name}</span>
              <div className="cat-account-input-wrap">
                <span className="cat-account-prefix">$</span>
                <input
                  className="cat-account-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={values[acc.id] || ''}
                  onChange={e => setValues(v => ({ ...v, [acc.id]: e.target.value }))}
                  onFocus={e => e.target.select()}
                  onBlur={handleBlur}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="cat-empty-accounts">
          No accounts yet —{' '}
          <button className="cat-empty-link" onClick={onEdit}>add some</button>
        </div>
      )}
    </div>
  )
}
