import { useState, useCallback } from 'react'
import { formatCurrency, parseAmount } from '../utils'

function formatDisplay(raw) {
  if (raw === '' || raw == null) return ''
  const n = parseAmount(raw)
  if (n === 0 && raw === '') return ''
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function CategoryCard({ category, snapshot, contributions = {}, onUpdate, onContributionChange, onEdit, estimated = false, estimates = {} }) {
  const [values, setValues] = useState(() => {
    const v = {}
    category.accounts.forEach(acc => {
      v[acc.id] = snapshot[acc.id] != null ? String(snapshot[acc.id]) : ''
    })
    return v
  })
  // Monthly contribution edits for the selected month (each month is independent).
  const [contribs, setContribs] = useState(() => {
    const v = {}
    category.accounts.forEach(acc => {
      v[acc.id] = contributions[acc.id] != null ? String(contributions[acc.id]) : ''
    })
    return v
  })
  const [focused, setFocused] = useState(null)

  // Contributions are deliberately excluded from the category total — they only
  // feed future estimates, not the current balance. On future months, the total
  // uses any value the user has overridden, falling back to the projection.
  const total = estimated
    ? category.accounts.reduce((s, a) => {
        const ov = values[a.id]
        return s + (ov != null && ov !== '' ? parseAmount(ov) : (estimates?.[a.id] || 0))
      }, 0)
    : category.accounts.reduce((s, a) => s + parseAmount(values[a.id] || '0'), 0)

  const handleBlur = useCallback(() => {
    setFocused(null)
    const entries = {}
    category.accounts.forEach(acc => {
      if (values[acc.id] !== '') entries[acc.id] = parseAmount(values[acc.id])
    })
    onUpdate(entries)
  }, [values, category.accounts, onUpdate])

  const handleContribBlur = useCallback(() => {
    setFocused(null)
    const entries = {}
    category.accounts.forEach(acc => {
      if (contribs[acc.id] !== '') entries[acc.id] = parseAmount(contribs[acc.id])
    })
    onContributionChange?.(entries)
  }, [contribs, category.accounts, onContributionChange])

  return (
    <div className="card cat-card">

      <div className="cat-card-header">
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
            <div key={acc.id} className="cat-account-block">
              <div className="cat-account-row">
                <span className="cat-account-name">{acc.name}</span>
                {(() => {
                  const override = values[acc.id]
                  const hasOverride = override != null && override !== ''
                  // On future months, show the projection until the user types
                  // an actual value (which is then saved to that month only).
                  const showingEst = estimated && !hasOverride
                  const display = focused === acc.id
                    ? override
                    : hasOverride
                      ? formatDisplay(override)
                      : estimated
                        ? formatCurrency(estimates?.[acc.id] || 0)
                        : ''
                  return (
                    <input
                      className={`cat-account-input${showingEst ? ' cat-account-est' : ''}`}
                      type="text"
                      inputMode="decimal"
                      placeholder="$0"
                      value={display}
                      onFocus={e => { setFocused(acc.id); e.target.select() }}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '')
                        setValues(v => ({ ...v, [acc.id]: raw }))
                      }}
                      onBlur={handleBlur}
                    />
                  )
                })()}
              </div>
              {category.contributing && (
                <div className="cat-contrib-row">
                  <span className="cat-contrib-label">Contribution</span>
                  {estimated ? (
                    <span className="cat-contrib-value cat-account-est">
                      {formatCurrency(contributions[acc.id] || 0)}/mo avg
                    </span>
                  ) : (
                    <div className="cat-contrib-field">
                      <input
                        className="cat-contrib-input"
                        type="text"
                        inputMode="decimal"
                        placeholder="$0"
                        value={focused === `c_${acc.id}` ? contribs[acc.id] : formatDisplay(contribs[acc.id])}
                        onFocus={e => { setFocused(`c_${acc.id}`); e.target.select() }}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '')
                          setContribs(v => ({ ...v, [acc.id]: raw }))
                        }}
                        onBlur={handleContribBlur}
                      />
                      <span className="cat-contrib-suffix">/mo</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Total row */}
          <div className="cat-account-total">
            <span className="cat-total-label">Total</span>
            <span
              className="cat-total-amount"
              style={{ color: estimated ? 'var(--c-ink-mute)' : category.type === 'liability' ? 'var(--c-danger)' : 'var(--c-ink)' }}
            >
              {formatCurrency(total)}{estimated ? ' (est)' : ''}
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
