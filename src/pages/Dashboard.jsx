import { useState } from 'react'
import MonthSelector from '../components/MonthSelector'
import CategoryCard from '../components/CategoryCard'
import NetWorthChart from '../components/NetWorthChart'
import EditCategorySheet from '../components/EditCategorySheet'
import { formatCurrency, formatDelta, formatMonthShort } from '../utils'

const RANGE_OPTIONS = ['1M', '3M', '6M', '1Y', 'ALL']
const RANGE_COUNTS = { '1M': 2, '3M': 3, '6M': 6, '1Y': 12 }

function getFilteredHistory(history, range) {
  if (range === 'ALL') return history
  const n = RANGE_COUNTS[range] ?? history.length
  return history.length <= n ? history : history.slice(-n)
}

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
  const [timeRange, setTimeRange] = useState('ALL')

  const netWorth = getNetWorth(selectedMonth)
  const prevMonth = getPrevMonth(selectedMonth)
  const delta = prevMonth != null ? netWorth - getNetWorth(prevMonth) : null
  const nwStr = formatCurrency(netWorth)
  const history = getHistory()
  const filteredHistory = getFilteredHistory(history, timeRange)
  const snapshot = getSnapshot(selectedMonth)
  const assets = getTotalAssets(selectedMonth)
  const liabilities = getTotalLiabilities(selectedMonth)
  const hasLiabilities = data.categories.some(c => c.type === 'liability')
  const editCat = editSheet && editSheet !== 'new' ? editSheet : null

  return (
    <div>
      {/* Hero — left aligned */}
      <div className="hero">
        <div className="hero-eyebrow">Net Worth</div>
        <div className="hero-amount">{nwStr}</div>
        {delta !== null && (
          <div className={`hero-delta-line${delta > 0 ? ' positive' : delta < 0 ? ' negative' : ''}`}>
            {delta >= 0 ? '+' : ''}{formatCurrency(delta)} this month
          </div>
        )}
      </div>

      {/* Trend line */}
      {filteredHistory.length >= 2 && (
        <div style={{ padding: '20px 20px 0' }}>
          <NetWorthChart data={filteredHistory} height={180} />
        </div>
      )}

      {/* Time range filter */}
      {history.length >= 2 && (
        <div className="range-pills">
          {RANGE_OPTIONS.map(r => (
            <button
              key={r}
              className={`range-pill${timeRange === r ? ' active' : ''}`}
              onClick={() => setTimeRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Month selector */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, marginBottom: 28 }}>
        <MonthSelector month={selectedMonth} onChange={onMonthChange} />
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
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-primary)' }}>
            Add Category
          </div>
        </button>
      </div>

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
