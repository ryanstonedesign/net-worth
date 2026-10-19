import { lazy, Suspense, useState } from 'react'
import MonthSelector from '../components/MonthSelector'
import ProgressiveBlur from '../components/ProgressiveBlur'
import { scenarioColor } from '../components/ScenarioCompareChart'
import { formatCurrency, formatMonthDisplay, getCurrentMonth } from '../utils'
import { RANGE_OPTIONS, RANGE_COUNTS, compareSeries, scenarioValueAt } from '../lib/scenarioSeries'

const ScenarioCompareChart = lazy(() => import('../components/ScenarioCompareChart'))
const NetWorthChart = lazy(() => import('../components/NetWorthChart'))

// Landing view after sign-in: every scenario's history and projection on one
// chart, with a card listing every scenario's total for the selected month,
// highest first. Tapping a scenario opens it. The month selector works as it
// does on a scenario: it moves the selected month, and the chart stretches to
// reach it.
// "Good morning, Alex" by the viewer's local time, with their first name.
function greeting(name) {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const first = (name || '').trim().split(/\s+/)[0]
  return first ? `Good ${part}, ${first}` : `Good ${part}`
}

export default function Home({ scenarios, userName, selectedMonth, onMonthChange, onOpenScenario }) {
  const [timeRange, setTimeRange] = useState('1Y')
  const currentMonth = getCurrentMonth()
  const [customYear, setCustomYear] = useState(currentMonth.slice(0, 4))

  const { rows } = compareSeries(scenarios, {
    currentMonth, range: timeRange, customYear, selectedMonth,
  })
  const hasData = rows.length >= 2

  // Highest total first; scenarios with no balance yet go last.
  const totals = scenarios
    .map((s, i) => ({ ...s, color: scenarioColor(i), total: scenarioValueAt(s.data, selectedMonth, currentMonth) }))
    .sort((a, b) => (b.total?.value ?? -Infinity) - (a.total?.value ?? -Infinity))

  return (
    <div className="dashboard home">
      <div className="hero home-hero">
        <div className="hero-eyebrow">{greeting(userName)}</div>
        <h1 className="home-title">{scenarios.length} {scenarios.length === 1 ? 'scenario' : 'scenarios'}</h1>
      </div>

      <div className="net-worth-chart-well home-chart">
        <Suspense fallback={<div className="net-worth-chart-loading" aria-hidden="true" />}>
          {hasData ? (
            <ScenarioCompareChart
              rows={rows}
              scenarios={scenarios}
              selectedMonth={selectedMonth}
              onSelectMonth={onMonthChange}
            />
          ) : (
            <NetWorthChart data={[]} height={220} emptyPointCount={RANGE_COUNTS[timeRange] ?? 12} />
          )}
        </Suspense>
      </div>

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

      {/* Every scenario's total for the selected month, highest first. Each
          row opens its scenario. */}
      <section className="card home-summary" aria-label={`Scenario totals for ${formatMonthDisplay(selectedMonth)}`}>
        <ul className="compare-tooltip__list home-summary__list">
          {totals.map(s => (
            <li key={s.id}>
              <button type="button" className="home-summary__row" onClick={() => onOpenScenario(s.id)} title={s.name}>
                <span className="compare-tooltip__swatch" style={{ background: s.color }} aria-hidden="true" />
                <span className="compare-tooltip__name">{s.name}</span>
                <span className="compare-tooltip__value">{s.total ? formatCurrency(s.total.value) : '—'}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="month-float">
        {/* Scrim behind the pill, inside its own layer so it can never paint
            over the controls. */}
        <ProgressiveBlur edge="bottom" className="month-float-scrim" />
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
