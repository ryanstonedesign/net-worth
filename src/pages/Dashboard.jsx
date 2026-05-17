import { useState } from 'react'
import MonthSelector from '../components/MonthSelector'
import NetWorthChart from '../components/NetWorthChart'
import UpdateCategorySheet from '../components/UpdateCategorySheet'
import EditCategorySheet from '../components/EditCategorySheet'
import { formatCurrency, formatDelta, formatMonthShort } from '../utils'

export default function Dashboard({
  data,
  selectedMonth,
  onMonthChange,
  addCategoryWithAccounts,
  updateCategory,
  deleteCategory,
  addAccount,
  deleteAccount,
  updateCategorySnapshot,
  getSnapshot,
  getCategoryTotal,
  getNetWorth,
  getHistory,
  getPrevMonth,
  getTotalAssets,
  getTotalLiabilities,
}) {
  const [updateSheet, setUpdateSheet] = useState(null)  // category id
  const [editSheet, setEditSheet] = useState(null)       // category obj | 'new'

  const netWorth = getNetWorth(selectedMonth)
  const prevMonth = getPrevMonth(selectedMonth)
  const delta = prevMonth != null ? netWorth - getNetWorth(prevMonth) : null
  const history = getHistory()
  const snapshot = getSnapshot(selectedMonth)
  const assets = getTotalAssets(selectedMonth)
  const liabilities = getTotalLiabilities(selectedMonth)
  const hasLiabilities = data.categories.some(c => c.type === 'liability')

  const updateCat = updateSheet ? data.categories.find(c => c.id === updateSheet) : null
  const editCat = editSheet && editSheet !== 'new' ? editSheet : null

  return (
    <div>
      {/* Sticky month selector */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', justifyContent: 'center',
        padding: '18px 20px 12px',
        background: 'rgba(220,232,236,0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <MonthSelector month={selectedMonth} onChange={onMonthChange} />
      </div>

      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">Net Worth</div>
        <div className="hero-amount">{formatCurrency(netWorth)}</div>
        {delta != null ? (
          <div className={`hero-delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'}`}>
            {delta > 0
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              : delta < 0
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              : null}
            {formatDelta(delta)} vs {formatMonthShort(prevMonth)}
          </div>
        ) : (
          <div className="hero-delta neutral" style={{ fontSize: 13 }}>Add a category below to start</div>
        )}
      </div>

      {/* Asset / Liability summary */}
      {data.categories.length > 0 && (
        <div className="summary-row">
          <div className="card summary-cell assets">
            <div className="summary-cell-label">Assets</div>
            <div className="summary-cell-amount">{formatCurrency(assets)}</div>
          </div>
          {hasLiabilities && (
            <div className="card summary-cell liabilities">
              <div className="summary-cell-label">Liabilities</div>
              <div className="summary-cell-amount">{formatCurrency(liabilities)}</div>
            </div>
          )}
        </div>
      )}

      {/* Categories */}
      <div style={{ paddingLeft: 20, marginBottom: 12 }}>
        <span className="section-title">Categories</span>
      </div>

      <div className="cat-scroll">
        {data.categories.map(cat => {
          const total = getCategoryTotal(cat, selectedMonth)
          const pct = netWorth !== 0 ? Math.round((total / Math.abs(netWorth)) * 100) : 0
          return (
            <button
              key={cat.id}
              className="card cat-card"
              onClick={() => setUpdateSheet(cat.id)}
            >
              <div className="cat-card-icon-wrap" style={{ background: cat.color + '22' }}>
                {cat.icon}
              </div>
              <div className="cat-card-body">
                <div className="cat-card-label">{cat.name}</div>
                <div className="cat-card-amount" style={{ color: cat.type === 'liability' ? 'var(--c-danger)' : 'var(--c-ink)' }}>
                  {formatCurrency(total)}
                </div>
              </div>
              <div className="cat-card-right">
                {total === 0
                  ? <div className="cat-card-hint">tap to update</div>
                  : netWorth !== 0
                  ? <div className="cat-card-pct">{Math.abs(pct)}%</div>
                  : null}
              </div>
              <button
                className="cat-card-edit"
                onClick={e => { e.stopPropagation(); setEditSheet(cat) }}
                title="Edit category"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
            </button>
          )
        })}

        {/* Add category card */}
        <button className="cat-card-add" onClick={() => setEditSheet('new')}>
          <div className="cat-card-add-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-primary)' }}>
            Add Category
          </div>
        </button>
      </div>

      {/* Trend chart */}
      {history.length >= 2 && <NetWorthChart data={history} />}

      {/* Bottom padding */}
      <div style={{ height: 40 }} />

      {/* Update sheet */}
      {updateCat && (
        <UpdateCategorySheet
          key={updateCat.id + selectedMonth}
          category={updateCat}
          month={selectedMonth}
          snapshot={snapshot}
          onSave={entries => updateCategorySnapshot(selectedMonth, entries)}
          onEdit={() => setEditSheet(updateCat)}
          onClose={() => setUpdateSheet(null)}
        />
      )}

      {/* Edit / new category sheet */}
      {editSheet && (
        <EditCategorySheet
          category={editCat}
          onSave={(cat, localAccounts) => {
            if (editSheet === 'new') {
              addCategoryWithAccounts(cat, localAccounts)
            } else {
              updateCategory(editCat.id, { name: cat.name, type: cat.type, color: cat.color, icon: cat.icon })
            }
            setEditSheet(null)
          }}
          onDelete={() => { deleteCategory(editCat.id); setEditSheet(null) }}
          onClose={() => setEditSheet(null)}
          addAccount={addAccount}
          deleteAccount={deleteAccount}
        />
      )}
    </div>
  )
}
