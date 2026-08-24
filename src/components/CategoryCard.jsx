import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { formatCurrency, parseAmount } from '../utils'

function formatDisplay(raw) {
  if (raw === '' || raw == null) return ''
  const n = parseAmount(raw)
  if (n === 0 && raw === '') return ''
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function valuesFor(accounts, source) {
  const values = {}
  accounts.forEach(acc => {
    values[acc.id] = source?.[acc.id] != null ? String(source[acc.id]) : ''
  })
  return values
}

export default function CategoryCard({ category, snapshot, contributions = {}, contribEstimates = {}, onUpdate, onContributionChange, onEdit, estimated = false, estimates = {}, month, refreshToken = 0 }) {
  const [values, setValues] = useState(() => valuesFor(category.accounts, snapshot))
  // Monthly contribution edits for the selected month (each month is independent).
  const [contribs, setContribs] = useState(() => valuesFor(category.accounts, contributions))
  const [focused, setFocused] = useState(null)
  const previousMonthRef = useRef(month)
  const numberMotionTimerRef = useRef(null)
  const [numberMotion, setNumberMotion] = useState({ id: 0, active: false })
  const accountSignature = category.accounts.map(acc => acc.id).join('|')
  const monthNumberClass = numberMotion.active ? ' cat-month-number' : ''

  // Keep the card mounted as the selected month changes. Sync its editable
  // values before paint so only the number fields transition; the card surface,
  // header, and account rows remain completely still.
  useLayoutEffect(() => {
    const monthChanged = previousMonthRef.current !== month
    setValues(valuesFor(category.accounts, snapshot))
    setContribs(valuesFor(category.accounts, contributions))
    setFocused(null)

    if (monthChanged) {
      window.clearTimeout(numberMotionTimerRef.current)
      setNumberMotion(state => ({ id: state.id + 1, active: true }))
      numberMotionTimerRef.current = window.setTimeout(() => {
        setNumberMotion(state => ({ ...state, active: false }))
      }, 450)
    }

    previousMonthRef.current = month
  }, [month, refreshToken, accountSignature]) // eslint-disable-line react-hooks/exhaustive-deps

  // Do not leave a delayed state update behind if the category is removed.
  useEffect(() => {
    return () => window.clearTimeout(numberMotionTimerRef.current)
  }, [])

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
                      key={`${acc.id}-${numberMotion.id}`}
                      className={`cat-account-input${showingEst ? ' cat-account-est' : ''}${monthNumberClass}`}
                      type="text"
                      inputMode="decimal"
                      placeholder="$0"
                      value={display}
                      onFocus={e => { setFocused(acc.id); e.target.select() }}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '')
                        setValues(v => ({ ...v, [acc.id]: raw }))
                        // Commit live, not just on blur — iOS's keyboard-dismiss
                        // key hides the keyboard without blurring, which would
                        // leave the edit unsaved until a stray tap elsewhere.
                        if (raw !== '') onUpdate({ [acc.id]: parseAmount(raw) })
                      }}
                      onBlur={handleBlur}
                    />
                  )
                })()}
              </div>
              {category.contributing && (
                <div className="cat-contrib-row">
                  <span className="cat-contrib-label">Contribution</span>
                  {(() => {
                    const override = contribs[acc.id]
                    const hasOverride = override != null && override !== ''
                    // On future months, show the average until the user types a
                    // value, which overrides the contribution for that month only.
                    const showingEst = estimated && !hasOverride
                    const display = focused === `c_${acc.id}`
                      ? override
                      : hasOverride
                        ? formatDisplay(override)
                        : estimated
                          ? formatCurrency(contribEstimates?.[acc.id] || 0)
                          : ''
                    return (
                      <div className="cat-contrib-field">
                        <input
                          key={`${acc.id}-${numberMotion.id}`}
                          className={`cat-contrib-input${showingEst ? ' cat-account-est' : ''}${monthNumberClass}`}
                          type="text"
                          inputMode="decimal"
                          placeholder="$0"
                          value={display}
                          onFocus={e => { setFocused(`c_${acc.id}`); e.target.select() }}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '')
                            setContribs(v => ({ ...v, [acc.id]: raw }))
                            // Same live commit as balances — see above.
                            if (raw !== '') onContributionChange?.({ [acc.id]: parseAmount(raw) })
                          }}
                          onBlur={handleContribBlur}
                        />
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          ))}

          {/* Total row */}
          <div className="cat-account-total">
            <span className="cat-total-label">Total</span>
            <span
              key={numberMotion.id}
              className={`cat-total-amount${estimated ? ' estimated' : ''}${category.type === 'liability' ? ' liability' : ''}${monthNumberClass}`}
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
