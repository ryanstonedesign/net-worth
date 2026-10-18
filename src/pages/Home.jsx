import { lazy, Suspense, useState } from 'react'
import MonthSelector from '../components/MonthSelector'
import ProgressiveBlur from '../components/ProgressiveBlur'
import { scenarioColor } from '../components/ScenarioCompareChart'
import { formatCurrency, formatMonthDisplay, getCurrentMonth } from '../utils'
import { RANGE_OPTIONS, RANGE_COUNTS, compareSeries, scenarioValueAt } from '../lib/scenarioSeries'

const ScenarioCompareChart = lazy(() => import('../components/ScenarioCompareChart'))
const NetWorthChart = lazy(() => import('../components/NetWorthChart'))

// Landing view after sign-in: every scenario's history and projection on one
// chart, with a card per scenario showing its total for the selected month.
// Tapping a card opens that scenario. The month selector works as it does on
// a scenario: it moves the selected month, and the chart stretches to reach it.
export default function Home({ scenarios, selectedMonth, onMonthChange, onOpenScenario }) {
  const [timeRange, setTimeRange] = useState('1Y')
  const currentMonth = getCurrentMonth()
  const [customYear, setCustomYear] = useState(currentMonth.slice(0, 4))

  const { rows, lastMonth } = compareSeries(scenarios, {
    currentMonth, range: timeRange, customYear, selectedMonth,
  })
  const hasData = rows.length >= 2

  const cards = scenarios.map((s, i) => ({
    ...s,
    color: scenarioColor(i),
    total: scenarioValueAt(s.data, selectedMonth, currentMonth),
  }))

  return (
    <div className="dashboard home">
      <div className="hero home-hero">
        <div className="hero-eyebrow">All scenarios</div>
        <h1 className="home-title">{formatMonthDisplay(selectedMonth)}</h1>
        <p className="home-sub">
          {lastMonth && selectedMonth > lastMonth
            ? 'Projected from your latest balances'
            : `${scenarios.length} ${scenarios.length === 1 ? 'scenario' : 'scenarios'} compared`}
        </p>
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

      <section className="home-cards" aria-label="Scenario totals">
        <div className="home-cards__track">
          {cards.map(s => (
            <button key={s.id} type="button" className="card home-card" onClick={() => onOpenScenario(s.id)} title={s.name}>
              <span className="home-card__name">
                <span className="home-card__swatch" style={{ background: s.color }} aria-hidden="true" />
                <span className="home-card__label">{s.name}</span>
              </span>
              <span className={`home-card__total${s.total?.estimated ? ' estimated' : ''}`}>
                {s.total ? formatCurrency(s.total.value) : '—'}
              </span>
              <span className="home-card__note">
                {!s.total ? 'No balances yet' : s.total.estimated ? 'Projected' : 'Recorded'}
              </span>
            </button>
          ))}
        </div>
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
