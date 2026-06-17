import { useState } from 'react'
import MonthSelector from '../components/MonthSelector'
import CategoryCard from '../components/CategoryCard'
import NetWorthChart from '../components/NetWorthChart'
import RollingNumber from '../components/RollingNumber'
import EditCategorySheet from '../components/EditCategorySheet'
import Modal from '../components/Modal'
import { formatCurrency, formatCompact, formatMonthDisplay, getAdjacentMonth, getCurrentMonth, parseAmount } from '../utils'

const RANGE_OPTIONS = ['1M', '3M', '6M', '1Y', 'custom']
const RANGE_COUNTS   = { '1M': 2,  '3M': 3,  '6M': 6,  '1Y': 12 }
const FORECAST_MONTHS = { '1M': 1, '3M': 3,  '6M': 6,  '1Y': 12 }
const MAX_FORECAST_MONTHS = 600 // 50 years — guard against absurd custom years

function monthIndex(month) {
  const [y, m] = month.split('-').map(Number)
  return y * 12 + (m - 1)
}

// Custom range forecasts every month from the last actual month through the end
// (December) of the year the user typed in.
function customForecastCount(lastMonth, year) {
  if (!lastMonth || !year) return 0
  const count = monthIndex(`${year}-12`) - monthIndex(lastMonth)
  return Math.max(0, Math.min(count, MAX_FORECAST_MONTHS))
}

function getFilteredHistory(history, range, selectedMonth) {
  let windowed
  if (range === 'custom') {
    windowed = history // show all past; the forecast extends ahead
  } else {
    const n = RANGE_COUNTS[range] ?? history.length
    windowed = history.length <= n ? history : history.slice(-n)
  }
  // Extend the window back to include a past month the user has scrolled to.
  if (selectedMonth && windowed.length && selectedMonth < windowed[0].month) {
    const earlier = history.filter(h => h.month >= selectedMonth && h.month < windowed[0].month)
    windowed = [...earlier, ...windowed]
  }
  return windowed
}

// Build a forecasting model for every account:
//   base         — most recent known balance
//   contribution — average of the per-month contributions recorded for this
//                  account (only when its category is contributing, else 0)
//   annual       — user's estimated annual growth rate (interest), as a fraction
// Growth and contribution are independent levers, so market return is never
// double-counted into the contribution.
function buildAccountModels(categories, snapshots, contributions, historyMonths, currentMonth) {
  // Only contributions up to the current month form the baseline average;
  // future months hold hypothetical overrides that shouldn't skew it.
  const contribMonths = Object.keys(contributions || {}).filter(m => m <= currentMonth)
  const models = {}
  categories.forEach(cat => cat.accounts.forEach(acc => {
    const series = historyMonths
      .map(m => snapshots[m]?.[acc.id])
      .filter(v => v != null)
    const base = series.length ? series[series.length - 1] : 0

    let contribution = 0
    if (cat.contributing) {
      const cseries = contribMonths
        .map(m => contributions[m]?.[acc.id])
        .filter(v => v != null)
      if (cseries.length) contribution = cseries.reduce((a, b) => a + b, 0) / cseries.length
    }
    models[acc.id] = { base, contribution, annual: (Number(acc.growth) || 0) / 100 }
  }))
  return models
}

// Forecast future months by walking forward one month at a time. Each month an
// account earns its monthly-equivalent interest and receives its average
// contribution — UNLESS the user has typed an override value for that month,
// which replaces the projection and becomes the base the next month builds on.
// Overrides live in `overrides` (a month → {accountId: value} map) so editing a
// future month never corrupts real history.
function generateForecast(categories, models, overrides, contribOverrides, lastMonth, count) {
  if (!lastMonth || count < 1) return []
  const running = {}
  Object.entries(models).forEach(([id, m]) => { running[id] = m.base })
  const out = []
  for (let i = 1; i <= count; i++) {
    const month = getAdjacentMonth(lastMonth, i)
    const ov  = overrides[month] || {}
    const cov = contribOverrides[month] || {}
    const accounts = {}
    const netWorth = categories.reduce((total, cat) => {
      const catTotal = cat.accounts.reduce((sum, acc) => {
        const m = models[acc.id]
        let v
        if (ov[acc.id] != null) {
          v = ov[acc.id]
        } else {
          const monthlyRate = Math.pow(1 + m.annual, 1 / 12) - 1
          const contribution = cat.contributing
            ? (cov[acc.id] != null ? cov[acc.id] : m.contribution)
            : 0
          v = Math.max(0, Math.round(running[acc.id] * (1 + monthlyRate) + contribution))
        }
        running[acc.id] = v
        accounts[acc.id] = v
        return sum + v
      }, 0)
      return total + (cat.type === 'liability' ? -catTotal : catTotal)
    }, 0)
    out.push({ month, netWorth, accounts, isForecast: true })
  }
  return out
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
  updateContributions,
  getContribution,
  clearMonthSnapshot,
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
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetNonce, setResetNonce] = useState(0) // bump to remount cards after a reset
  const [timeRange, setTimeRange] = useState('1Y')

  const currentMonth = getCurrentMonth()
  const [customYear, setCustomYear] = useState(currentMonth.slice(0, 4))

  // Only months up to the current calendar month are real history; later months
  // are projections, even when the user has typed override values into them.
  const history         = getHistory().filter(h => h.month <= currentMonth)

  const lastDataMonth = history.length > 0 ? history[history.length - 1].month : null
  // Base forecast horizon comes from the selected range, but always extend it
  // far enough to cover whatever (future) month the user has scrolled to.
  const rangeCount = timeRange === 'custom'
    ? customForecastCount(lastDataMonth, parseInt(customYear, 10))
    : FORECAST_MONTHS[timeRange] ?? 1
  const reachSelected = lastDataMonth ? monthIndex(selectedMonth) - monthIndex(lastDataMonth) : 0
  const forecastCount = lastDataMonth ? Math.max(rangeCount, reachSelected) : 0
  // The history window also extends back to include a past month being viewed.
  const filteredHistory = getFilteredHistory(history, timeRange, selectedMonth)

  const accountModels = buildAccountModels(data.categories, data.snapshots, data.contributions || {}, history.map(h => h.month), currentMonth)
  const forecastData  = generateForecast(data.categories, accountModels, data.snapshots, data.contributions || {}, lastDataMonth, forecastCount)
  const forecastMap   = Object.fromEntries(forecastData.map(d => [d.month, d.netWorth]))
  const forecastByMonth = Object.fromEntries(forecastData.map(d => [d.month, d]))

  const isEstimated      = !!(lastDataMonth && selectedMonth > lastDataMonth && selectedMonth in forecastMap)

  // Net worth at any month — forecast value for future months, real otherwise.
  const valueAt = (m) => (m in forecastMap ? forecastMap[m] : getNetWorth(m))

  const netWorth        = getNetWorth(selectedMonth)
  const displayNetWorth = isEstimated ? forecastMap[selectedMonth] : netWorth
  const prevMonth       = getPrevMonth(selectedMonth)
  const delta           = !isEstimated && prevMonth != null ? netWorth - getNetWorth(prevMonth) : null
  // For estimated months, show the projected month-over-month growth.
  const estDelta        = isEstimated ? valueAt(selectedMonth) - valueAt(getAdjacentMonth(selectedMonth, -1)) : null
  // Per-account projected balances for the selected month (estimated months only).
  const monthEstimates  = isEstimated ? (forecastByMonth[selectedMonth]?.accounts ?? {}) : null

  // Writing a balance to an estimated month that's at/before the current month
  // turns it into real history — which would drop every other (still-empty)
  // account to zero. Materialise the whole projection into that month first so
  // only the edited value changes and the rest keep their estimates.
  const handleSnapshotUpdate = (entries) => {
    if (isEstimated && selectedMonth <= currentMonth) {
      const projected = forecastByMonth[selectedMonth]?.accounts ?? {}
      updateCategorySnapshot(selectedMonth, { ...projected, ...getSnapshot(selectedMonth), ...entries })
    } else {
      updateCategorySnapshot(selectedMonth, entries)
    }
  }

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
  // Each month's own contributions are editable; future months fall back to the
  // average (shown as a hint) until overridden.
  const contribSnapshot = getContribution(selectedMonth)
  // A month is "edited" once it has manually-entered balances or contributions —
  // both can be reset back to the projected estimate.
  const hasEdits    = Object.keys(snapshot).length > 0 || Object.keys(contribSnapshot).length > 0
  const contribAverages = Object.fromEntries(
    Object.entries(accountModels).map(([id, m]) => [id, Math.round(m.contribution)])
  )
  // getTotalAssets/getTotalLiabilities only know about recorded snapshot values,
  // so on estimated months (which may have no — or only partial — overrides)
  // they'd show $0 for anything not explicitly entered. monthEstimates already
  // resolves each account to its override-or-projection, so use that instead.
  const assets      = isEstimated
    ? data.categories.filter(c => c.type !== 'liability')
        .reduce((t, c) => t + c.accounts.reduce((s, a) => s + (monthEstimates?.[a.id] || 0), 0), 0)
    : getTotalAssets(selectedMonth)
  const liabilities = isEstimated
    ? data.categories.filter(c => c.type === 'liability')
        .reduce((t, c) => t + c.accounts.reduce((s, a) => s + (monthEstimates?.[a.id] || 0), 0), 0)
    : getTotalLiabilities(selectedMonth)
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
          <span>
            {isEstimated
              ? `${estDelta >= 0 ? '+' : ''}${formatCurrency(estDelta)} (est)`
              : delta == null ? '—' : `${delta >= 0 ? '+' : ''}${formatCurrency(delta)} this month`}
          </span>
          {hasEdits && (
            <button className="hero-reset" onClick={() => setResetConfirm(true)}>Reset</button>
          )}
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
          <NetWorthChart key={timeRange} data={filteredHistory} forecastData={forecastData} selectedMonth={selectedMonth} height={180} goal={goal} onSelectMonth={onMonthChange} />
        </div>
      )}

      {/* Time range filter */}
      {history.length >= 2 && (
        <>
          <div className="range-pills">
            {RANGE_OPTIONS.map(r => (
              <button
                key={r}
                className={`range-pill${timeRange === r ? ' active' : ''}`}
                onClick={() => setTimeRange(r)}
              >
                {r === 'custom' ? 'Custom' : r}
              </button>
            ))}
          </div>
          {timeRange === 'custom' && (
            <div className="custom-range-row">
              <span className="custom-range-label">Estimate through end of</span>
              <input
                className="custom-range-input"
                inputMode="numeric"
                maxLength={4}
                placeholder="2035"
                value={customYear}
                onChange={e => setCustomYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              />
            </div>
          )}
        </>
      )}

      {/* Asset / Liability summary */}
      {data.categories.length > 0 && (
        <div className="summary-row">
          <div className="card summary-cell assets">
            <div className="summary-cell-label">Assets</div>
            <div className="summary-cell-amount" style={isEstimated ? { color: 'var(--c-ink-mute)' } : undefined}>{formatCurrency(assets)}</div>
          </div>
          {hasLiabilities && (
            <div className="card summary-cell liabilities">
              <div className="summary-cell-label">Liabilities</div>
              <div className="summary-cell-amount" style={isEstimated ? { color: 'var(--c-ink-mute)' } : undefined}>{formatCurrency(liabilities)}</div>
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
            key={cat.id + selectedMonth + isEstimated + resetNonce}
            category={cat}
            snapshot={snapshot}
            estimated={isEstimated}
            estimates={monthEstimates}
            contributions={contribSnapshot}
            contribEstimates={contribAverages}
            onUpdate={handleSnapshotUpdate}
            onContributionChange={entries => updateContributions(selectedMonth, entries)}
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
              updateCategory(editCat.id, { name: cat.name, type: cat.type, color: cat.color, icon: cat.icon, contributing: cat.contributing })
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

      {/* Reset-to-estimates confirmation */}
      {resetConfirm && (
        <Modal title="Reset to estimates?" onClose={() => setResetConfirm(false)}>
          <p style={{ fontSize: 14, color: 'var(--c-ink-mute)', lineHeight: 1.5, marginBottom: 24 }}>
            This clears the balances and contributions you entered for {formatMonthDisplay(selectedMonth)} and
            returns every category to its estimated projection. This can't be undone.
          </p>
          <button
            className="btn btn-primary btn-full"
            onClick={() => { clearMonthSnapshot(selectedMonth); setResetNonce(n => n + 1); setResetConfirm(false) }}
          >
            Reset to estimates
          </button>
          <button
            className="btn btn-secondary btn-full"
            style={{ marginTop: 12 }}
            onClick={() => setResetConfirm(false)}
          >
            Cancel
          </button>
        </Modal>
      )}

      {/* Floating month selector — hold a chevron to fast-scroll */}
      <div className="month-float">
        {selectedMonth !== currentMonth && (
          <button className="back-to-month" onClick={() => onMonthChange(currentMonth)}>
            Back to this month
          </button>
        )}
        <MonthSelector month={selectedMonth} onChange={onMonthChange} />
      </div>
    </div>
  )
}
