import { useState } from 'react'
import MonthSelector from '../components/MonthSelector'
import CategoryCard from '../components/CategoryCard'
import NetWorthChart from '../components/NetWorthChart'
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
  const [editSheet, setEditSheet] = useState(null) // category obj | 'new' | null

  const netWorth = getNetWorth(selectedMonth)
  const prevMonth = getPrevMonth(selectedMonth)
  const delta = prevMonth != null ? netWorth - getNetWorth(prevMonth) : null
  const history = getHistory()
  const snapshot = getSnapshot(selectedMonth)
  const assets = getTotalAssets(selectedMonth)
  const liabilities = getTotalLiabilities(selectedMonth)
  const hasLiabilities = data.categories.some(c => c.type === 'liability')
  const editCat = editSheet && editSheet !== 'new' ? editSheet : null

  return (
    <div>
      {/* Page header label */}
      <div className="hero-eyebrow" style={{ paddingTop: 28 }}>Net Worth</div>

      {/* Hero */}
      <div className="hero">
        <div className="hero-amount">{formatCurrency(netWorth)}</div>

        {/* Month selector */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}>
          <MonthSelector month={selectedMonth} onChange={onMonthChange} />
        </div>
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
        {data.categories.map(cat => (
          <CategoryCard
            key={cat.id + selectedMonth}
            category={cat}
            snapshot={snapshot}
            onUpdate={entries => updateCategorySnapshot(selectedMonth, entries)}
            onEdit={() => setEditSheet(cat)}
          />
        ))}

        {/* Add category */}
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

      <div style={{ height: 40 }} />

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
