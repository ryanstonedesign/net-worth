import { useState } from 'react'
import Modal from './Modal'
import { formatCurrency, formatMonthDisplay, parseAmount } from '../utils'

export default function UpdateCategorySheet({ category, month, snapshot, onSave, onEdit, onClose }) {
  const [values, setValues] = useState(() => {
    const v = {}
    category.accounts.forEach(acc => {
      v[acc.id] = snapshot[acc.id] != null ? String(snapshot[acc.id]) : ''
    })
    return v
  })

  const total = category.accounts.reduce((s, a) => s + parseAmount(values[a.id] || '0'), 0)

  const handleSave = () => {
    const entries = {}
    category.accounts.forEach(acc => {
      if (values[acc.id] !== '') entries[acc.id] = parseAmount(values[acc.id])
    })
    onSave(entries)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      {/* Sheet header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: category.color + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>
          {category.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{category.name}</div>
          <div style={{ fontSize: 13, color: 'var(--c-ink-mute)', marginTop: 3 }}>
            {formatCurrency(total)} &middot; {formatMonthDisplay(month)}
          </div>
        </div>
        <button
          onClick={() => { onClose(); onEdit() }}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(25,174,194,0.1)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--c-primary)', transition: 'background 0.15s',
          }}
          title="Edit category"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
      </div>

      {category.accounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>No accounts yet</div>
          <div style={{ fontSize: 13, color: 'var(--c-ink-mute)', marginBottom: 20 }}>
            Add accounts to start tracking this category.
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { onClose(); onEdit() }}>
            Add Accounts
          </button>
        </div>
      ) : (
        <>
          <div style={{ borderTop: '1px solid rgba(200,215,220,0.4)' }}>
            {category.accounts.map(acc => (
              <div key={acc.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid rgba(200,215,220,0.35)',
              }}>
                <div style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{acc.name}</div>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, fontWeight: 600, color: 'var(--c-ink-mute)', pointerEvents: 'none',
                  }}>$</span>
                  <input
                    className="update-amount-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={values[acc.id] || ''}
                    onChange={e => setValues(v => ({ ...v, [acc.id]: e.target.value }))}
                    onFocus={e => e.target.select()}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0 20px', fontSize: 13, fontWeight: 600, color: 'var(--c-ink-mute)',
          }}>
            <span>Total</span>
            <span style={{ color: 'var(--c-ink)', fontSize: 17 }}>{formatCurrency(total)}</span>
          </div>

          <button className="btn btn-primary btn-full" onClick={handleSave}>
            Save
          </button>
        </>
      )}
    </Modal>
  )
}
