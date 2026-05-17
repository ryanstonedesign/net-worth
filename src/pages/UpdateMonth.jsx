import { useState, useEffect, useCallback } from 'react'
import MonthSelector from '../components/MonthSelector'
import { formatCurrency, parseAmount } from '../utils'

function buildValues(categories, snapshot) {
  const vals = {}
  categories.forEach(cat => {
    cat.accounts.forEach(acc => {
      vals[acc.id] = snapshot[acc.id] != null ? String(snapshot[acc.id]) : ''
    })
  })
  return vals
}

export default function UpdateMonth({
  data,
  selectedMonth,
  onMonthChange,
  getSnapshot,
  setMonthSnapshot,
  getPrevMonth,
  getCategoryTotal,
}) {
  const [values, setValues] = useState(() =>
    buildValues(data.categories, getSnapshot(selectedMonth))
  )
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValues(buildValues(data.categories, getSnapshot(selectedMonth)))
    setSaved(false)
  }, [selectedMonth, data.categories])

  const handleChange = useCallback((id, val) => {
    setSaved(false)
    setValues(v => ({ ...v, [id]: val }))
  }, [])

  const handleCopyPrev = useCallback(() => {
    const prev = getPrevMonth(selectedMonth)
    if (!prev) return
    setValues(buildValues(data.categories, getSnapshot(prev)))
    setSaved(false)
  }, [selectedMonth, data.categories, getPrevMonth, getSnapshot])

  const handleSave = useCallback(() => {
    const snap = {}
    Object.entries(values).forEach(([id, val]) => {
      const n = parseAmount(val)
      if (val !== '') snap[id] = n
    })
    setMonthSnapshot(selectedMonth, snap)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }, [values, selectedMonth, setMonthSnapshot])

  const prevMonth = getPrevMonth(selectedMonth)

  if (data.categories.length === 0) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <div className="empty-icon">📋</div>
        <div className="empty-title">No categories yet</div>
        <div className="empty-desc">Add categories and accounts in Manage first.</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="page-top" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="page-top-title">Update</div>
          {prevMonth && (
            <button className="btn btn-secondary btn-sm" onClick={handleCopyPrev}>
              Copy {prevMonth.slice(0, 7).replace('-', '/')}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MonthSelector month={selectedMonth} onChange={onMonthChange} />
        </div>
      </div>

      {/* Category sections */}
      <div style={{ paddingTop: 8 }}>
        {data.categories.map(cat => {
          const preview = cat.accounts.reduce((sum, acc) => {
            const n = parseAmount(values[acc.id] || '0')
            return sum + n
          }, 0)

          return (
            <div key={cat.id} className="update-cat-section">
              <div className="card" style={{ margin: '0 20px', borderRadius: 22 }}>
                <div className="update-cat-header">
                  <div
                    className="update-cat-icon"
                    style={{ background: cat.color + '22' }}
                  >
                    {cat.icon}
                  </div>
                  <div className="update-cat-name">{cat.name}</div>
                  <div className="update-cat-total">
                    {formatCurrency(preview)}
                  </div>
                </div>

                {cat.accounts.length === 0 ? (
                  <div style={{ padding: '12px 20px 16px', color: '#4E6F73', fontSize: 13 }}>
                    No accounts — add them in Manage.
                  </div>
                ) : (
                  cat.accounts.map(acc => (
                    <div key={acc.id} className="update-account-row">
                      <div className="update-account-name">{acc.name}</div>
                      <div className="update-amount-wrap">
                        <span className="update-amount-prefix">$</span>
                        <input
                          className="update-amount-input"
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={values[acc.id] || ''}
                          onChange={e => handleChange(acc.id, e.target.value)}
                          onFocus={e => e.target.select()}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Save */}
      <div className="sticky-bottom">
        <button
          className={`btn ${saved ? 'btn-tertiary' : 'btn-primary'} btn-full`}
          onClick={handleSave}
        >
          {saved ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Saved
            </>
          ) : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
