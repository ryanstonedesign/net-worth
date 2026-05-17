import { useState } from 'react'
import MonthSelector from '../components/MonthSelector'
import CategoryCard from '../components/CategoryCard'
import NetWorthChart from '../components/NetWorthChart'
import EditCategorySheet from '../components/EditCategorySheet'
import { formatCurrency, formatDelta, formatMonthShort, getAdjacentMonth, getCurrentMonth } from '../utils'

const RANGE_OPTIONS = ['1M', '3M', '6M', '1Y', 'ALL']
const RANGE_COUNTS   = { '1M': 2,  '3M': 3,  '6M': 6,  '1Y': 12 }
const FORECAST_MONTHS = { '1M': 1, '3M': 3,  '6M': 6,  '1Y': 12 }

function getFilteredHistory(history, range) {
  if (range === 'ALL') return history
  const n = RANGE_COUNTS[range] ?? history.length
  return history.length <= n ? history : history.slice(-n)
}

function generateForecast(filteredHistory, range) {
  if (filteredHistory.length < 2) return []
  const count = range === 'ALL'
    ? filteredHistory.length - 1
    : FORECAST_MONTHS[range] ?? 1
  const first = filteredHistory[0]
  const last  = filteredHistory[filteredHistory.length - 1]
  const slope = (last.netWorth - first.netWorth) / (filteredHistory.length - 1)
  return Array.from({ length: count }, (_, i) => ({
    month: getAdjacentMonth(last.month, i + 1),
    netWorth: Math.round(last.netWorth + slope * (i + 1)),
    isForecast: true,
  }))
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
  renameAccount,
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

  const history        = getHistory()
  const filteredHistory = getFilteredHistory(history, timeRange)
  const forecastData   = generateForecast(filteredHistory, timeRange)
  const forecastMap    = Object.fromEntries(forecastData.map(d => [d.month, d.netWorth]))

  const lastDataMonth    = history.length > 0 ? history[history.length - 1].month : null
  const maxForecastMonth = forecastData.length > 0 ? forecastData[forecastData.length - 1].month : getCurrentMonth()
  const isEstimated    = !!(lastDataMonth && selectedMonth > lastDataMonth && selectedMonth in forecastMap)

  const netWorth       = getNetWorth(selectedMonth)
  const displayNetWorth = isEstimated ? forecastMap[selectedMonth] : netWorth
  const prevMonth      = getPrevMonth(selectedMonth)
  const delta          = !isEstimated && prevMonth != null ? netWorth - getNetWorth(prevMonth) : null

  const snapshot    = getSnapshot(selectedMonth)
  const assets      = getTotalAssets(selectedMonth)
  const liabilities = getTotalLiabilities(selectedMonth)
  const hasLiabilities = data.categories.some(c => c.type === 'liability')
  const editCat     = editSheet && editSheet !== 'new' ? editSheet : null

  return (
    <div>
      {/* Hero — left aligned */}
      <div className="hero">
        <div className="hero-eyebrow">Net Worth</div>
        <div className={`hero-amount${isEstimated ? ' estimated' : ''}`}>
          {formatCurrency(displayNetWorth)}
        </div>
        <div className={`hero-delta-line${!isEstimated && delta != null && delta > 0 ? ' positive' : !isEstimated && delta != null && delta < 0 ? ' negative' : ''}`}>
          {isEstimated ? 'Estimated' : delta == null ? '—' : `${delta >= 0 ? '+' : ''}${formatCurrency(delta)} this month`}
        </div>
      </div>

      {/* Trend line + forecast */}
      {filteredHistory.length >= 2 && (
        <div style={{ padding: '20px 20px 0' }}>
          <NetWorthChart data={filteredHistory} forecastData={forecastData} selectedMonth={selectedMonth} height={180} />
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
        <MonthSelector month={selectedMonth} onChange={onMonthChange} maxMonth={maxForecastMonth} />
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
          renameAccount={renameAccount}
        />
      )}
    </div>
  )
}
