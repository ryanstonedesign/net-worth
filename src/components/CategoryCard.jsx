import { useState, useCallback } from 'react'
import { formatCurrency, parseAmount } from '../utils'

function formatDisplay(raw) {
  if (raw === '' || raw == null) return ''
  const n = parseAmount(raw)
  if (n === 0 && raw === '') return ''
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function CategoryCard({ category, snapshot, onUpdate, onEdit }) {
  const [values, setValues] = useState(() => {
    const v = {}
    category.accounts.forEach(acc => {
      v[acc.id] = snapshot[acc.id] != null ? String(snapshot[acc.id]) : ''
    })
    return v
  })
  const [focused, setFocused] = useState(null)

  const total = category.accounts.reduce((s, a) => s + parseAmount(values[a.id] || '0'), 0)

  const handleBlur = useCallback(() => {
    setFocused(null)
    const entries = {}
    category.accounts.forEach(acc => {
      if (values[acc.id] !== '') entries[acc.id] = parseAmount(values[acc.id])
    })
    onUpdate(entries)
  }, [values, category.accounts, onUpdate])

  return (
    <div className="card cat-card">

      <div className="cat-card-header">
        <div className="cat-card-icon-wrap" style={{ background: category.color + '22' }}>
          {category.icon}
        </div>
        <div className="cat-card-label">{category.name}</div>
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
              <input
                className="cat-account-input"
                type="text"
                inputMode="decimal"
                placeholder="$0"
                value={focused === acc.id ? values[acc.id] : formatDisplay(values[acc.id])}
                onFocus={e => { setFocused(acc.id); e.target.select() }}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '')
                  setValues(v => ({ ...v, [acc.id]: raw }))
                }}
                onBlur={handleBlur}
              />
            </div>
          ))}

          {/* Total row */}
          <div className="cat-account-total">
            <span className="cat-total-label">Total</span>
            <span
              className="cat-total-amount"
              style={{ color: category.type === 'liability' ? 'var(--c-danger)' : 'var(--c-ink)' }}
            >
              {formatCurrency(total)}
            </span>
          </div>
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
