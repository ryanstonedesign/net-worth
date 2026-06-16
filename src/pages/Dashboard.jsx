import { useState } from 'react'
import MonthSelector from '../components/MonthSelector'
import CategoryCard from '../components/CategoryCard'
import NetWorthChart from '../components/NetWorthChart'
import RollingNumber from '../components/RollingNumber'
import EditCategorySheet from '../components/EditCategorySheet'
import Modal from '../components/Modal'
import { formatCurrency, formatCompact, getAdjacentMonth, getCurrentMonth, parseAmount } from '../utils'

const RANGE_OPTIONS = ['1M', '3M', '6M', '1Y', 'ALL']
const RANGE_COUNTS   = { '1M': 2,  '3M': 3,  '6M': 6,  '1Y': 12 }
const FORECAST_MONTHS = { '1M': 1, '3M': 3,  '6M': 6,  '1Y': 12 }

function getFilteredHistory(history, range) {
  if (range === 'ALL') return history
  const n = RANGE_COUNTS[range] ?? history.length
  return history.length <= n ? history : history.slice(-n)
}

// Forecast future months by compounding each account's last known value by
// its own estimated annual growth rate. Each account grows independently, so
// the projected net worth reflects per-account compound growth rather than a
// single blended slope.
function generateForecast(categories, lastSnapshot, lastMonth, count) {
  if (!lastMonth || count < 1) return []
  return Array.from({ length: count }, (_, i) => {
    const monthsAhead = i + 1
    const netWorth = Math.round(categories.reduce((total, cat) => {
      const catTotal = cat.accounts.reduce((sum, acc) => {
        const base   = lastSnapshot[acc.id] || 0
        const annual = (Number(acc.growth) || 0) / 100
        // Annual rate interpolated monthly: base × (1+rate)^(months/12).
        return sum + base * Math.pow(1 + annual, monthsAhead / 12)
      }, 0)
      return total + (cat.type === 'liability' ? -catTotal : catTotal)
    }, 0))
    return { month: getAdjacentMonth(lastMonth, monthsAhead), netWorth, isForecast: true }
  })
}

function GoalEditor({ goal, onSave, onClose }) {
  const [raw, setRaw] = useState(goal != null ? String(goal) : '')

  const parsed = parseAmount(raw)
  const valid  = raw.trim() !== '' && parsed > 0

  return (
    <>
      <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', marginBottom: 20, lineHeight: 1.5 }}>
        Set a net worth target and see how your forecast tracks toward it.
      </p>
      <div className="form-group">
        <label className="form-label">Target amount</label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, fontWeight: 600, color: 'var(--c-ink-mute)',
          }}>$</span>
          <input
            className="input"
            style={{ paddingLeft: 32, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}
            inputMode="decimal"
            placeholder="500,000"
            value={raw}
            onChange={e => setRaw(e.target.value.replace(/[^0-9.,]/g, ''))}
          />
        </div>
      </div>
      <button
        className="btn btn-primary btn-full"
        style={{ marginTop: 8 }}
        onClick={() => { if (valid) onSave(parsed) }}
        disabled={!valid}
      >
        Save Goal
      </button>
      {goal != null && (
        <button
          style={{
            display: 'block', width: '100%', marginTop: 12, padding: '12px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: 'var(--c-danger)',
            fontFamily: 'var(--font)',
          }}
          onClick={() => onSave(null)}
        >
          Clear Goal
        </button>
      )}
    </>
  )
}

export default function Dashboard({
  data,
  selectedMonth,
  onMonthChange,
  goal,
  setGoal,
  addCategoryWithAccounts,
  updateCategory,
  deleteCategory,
  addAccount,
  deleteAccount,
  renameAccount,
  setAccountGrowth,
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
  const [goalOpen, setGoalOpen]   = useState(false)
  const [timeRange, setTimeRange] = useState('ALL')

  const history         = getHistory()
  const filteredHistory = getFilteredHistory(history, timeRange)

  const lastDataMonth = history.length > 0 ? history[history.length - 1].month : null
  const forecastCount = lastDataMonth
    ? (timeRange === 'ALL' ? Math.max(history.length - 1, 1) : FORECAST_MONTHS[timeRange] ?? 1)
    : 0
  const forecastData = generateForecast(
    data.categories, getSnapshot(lastDataMonth), lastDataMonth, forecastCount
  )
  const forecastMap  = Object.fromEntries(forecastData.map(d => [d.month, d.netWorth]))

  const maxForecastMonth = forecastData.length > 0 ? forecastData[forecastData.length - 1].month : getCurrentMonth()
  const isEstimated      = !!(lastDataMonth && selectedMonth > lastDataMonth && selectedMonth in forecastMap)

  // Net worth at any month — forecast value for future months, real otherwise.
  const valueAt = (m) => (m in forecastMap ? forecastMap[m] : getNetWorth(m))

  const netWorth        = getNetWorth(selectedMonth)
  const displayNetWorth = isEstimated ? forecastMap[selectedMonth] : netWorth
  const prevMonth       = getPrevMonth(selectedMonth)
  const delta           = !isEstimated && prevMonth != null ? netWorth - getNetWorth(prevMonth) : null
  // For estimated months, show the projected month-over-month growth.
  const estDelta        = isEstimated ? valueAt(selectedMonth) - valueAt(getAdjacentMonth(selectedMonth, -1)) : null

  // Months-to-goal: use full history slope for stability across range changes
  const goalSlope = history.length >= 2
    ? (history[history.length - 1].netWorth - history[0].netWorth) / (history.length - 1)
    : null
  const monthsToGoal = goal != null && goalSlope != null && goalSlope > 0 && netWorth < goal
    ? Math.ceil((goal - netWorth) / goalSlope)
    : null
  const goalReached = goal != null && netWorth >= goal

  const goalLabel = goalReached
    ? 'Goal reached'
    : monthsToGoal != null
      ? monthsToGoal > 24
        ? `~${Math.round(monthsToGoal / 12)} years to goal`
        : `~${monthsToGoal} months to goal`
      : null

  const snapshot    = getSnapshot(selectedMonth)
  const assets      = getTotalAssets(selectedMonth)
  const liabilities = getTotalLiabilities(selectedMonth)
  const hasLiabilities = data.categories.some(c => c.type === 'liability')
  // Derive the live category from current data so account add/delete/rename
  // inside the sheet reflect instantly — editSheet only holds the id reference.
  const editCat     = editSheet && editSheet !== 'new'
    ? (data.categories.find(c => c.id === editSheet.id) ?? editSheet)
    : null

  return (
    <div>
      {/* Hero — left aligned */}
      <div className="hero">
        <div className="hero-eyebrow">Net Worth</div>
        <div className={`hero-amount${isEstimated ? ' estimated' : ''}`}>
          <RollingNumber value={displayNetWorth} />
        </div>
        <div className={`hero-delta-line${(isEstimated ? estDelta : delta) > 0 ? ' positive' : (isEstimated ? estDelta : delta) < 0 ? ' negative' : ''}`}>
          {isEstimated
            ? `${estDelta >= 0 ? '+' : ''}${formatCurrency(estDelta)} (est)`
            : delta == null ? '—' : `${delta >= 0 ? '+' : ''}${formatCurrency(delta)} this month`}
        </div>

        {/* Goal row */}
        <button className="hero-goal" onClick={() => setGoalOpen(true)}>
          {goal == null ? (
            <span className="hero-goal-set">Set a goal</span>
          ) : (
            <span className="hero-goal-time">{goalLabel ?? 'Goal set'}</span>
          )}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, opacity: 0.5, flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Trend line + forecast */}
      {filteredHistory.length >= 2 && (
        <div style={{ padding: '20px 20px 0' }}>
          <NetWorthChart key={timeRange} data={filteredHistory} forecastData={forecastData} selectedMonth={selectedMonth} height={180} goal={goal} />
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
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 20, paddingRight: 20, marginBottom: 12 }}>
        <span className="section-title">Categories</span>
        {data.categories.length > 0 && (
          <button className="add-category-link" onClick={() => setEditSheet('new')}>Add</button>
        )}
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

        {/* Add category card — only when empty */}
        {data.categories.length === 0 && (
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
        )}
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
          setAccountGrowth={setAccountGrowth}
        />
      )}

      {/* Goal editor sheet */}
      {goalOpen && (
        <Modal title="Net Worth Goal" onClose={() => setGoalOpen(false)}>
          <GoalEditor
            goal={goal}
            onSave={(v) => { setGoal(v); setGoalOpen(false) }}
            onClose={() => setGoalOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
