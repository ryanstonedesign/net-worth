import { useCallback, useEffect, useRef } from 'react'
import { LineChart, Line, Tooltip, ResponsiveContainer, ReferenceLine, YAxis, XAxis } from 'recharts'
import { formatMonthDisplay, formatCurrency } from '../utils'

// Every scenario on one plot for the Home screen, drawn the way the scenario
// chart draws one: solid history, dashed projection, same stroke weight. There
// are no month markers — with several lines they only crowd each other. Hover
// or press anywhere on the plot and one popover lists every scenario's total
// for that month; a press also moves the selected month, as it does on a
// scenario chart.
//
// Scenario colours come from scenarioColor(index) so the lines, popover
// swatches and Home cards always agree. Emerald is last: it sits closest to
// the shared history teal.
const SCENARIO_COLORS = ['#7c6cff', '#2f8fe8', '#e0559f', '#d9921f', '#0fa3b1', '#16b887']
const SHARED_HISTORY_COLOR = 'var(--chart-history)'

// Synced scenarios share one recorded past, so their history lines would lie
// exactly on top of each other, showing whichever drew last in its colour as
// if the past belonged to that scenario. Group identical histories and draw
// each group once: a shared past in the app's history teal, a history only
// one scenario has in that scenario's colour.
function historyGroups(rows, scenarios) {
  const groups = new Map()
  scenarios.forEach((s, i) => {
    const sig = rows.map(r => r[`${s.id}:h`] ?? '').join('|')
    if (!sig.replace(/\|/g, '')) return
    if (!groups.has(sig)) groups.set(sig, { key: `${s.id}:h`, indexes: [] })
    groups.get(sig).indexes.push(i)
  })
  return [...groups.values()].map(g => ({
    dataKey: g.key,
    color: g.indexes.length > 1 ? SHARED_HISTORY_COLOR : scenarioColor(g.indexes[0]),
  }))
}
export function scenarioColor(index) {
  return SCENARIO_COLORS[index % SCENARIO_COLORS.length]
}

function CompareTooltip({ active, payload, scenarios }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  const rows = scenarios
    .map((s, i) => ({ ...s, color: scenarioColor(i), value: point[s.id] }))
    .filter(s => s.value != null)
    .sort((a, b) => b.value - a.value)
  if (!rows.length) return null
  return (
    <div className="nw-chart-tooltip compare-tooltip">
      <div className="nw-chart-tooltip__label">
        {formatMonthDisplay(point.month)}{point.isForecast ? ' · Est.' : ''}
      </div>
      <ul className="compare-tooltip__list">
        {rows.map(s => (
          <li key={s.id}>
            <span className="compare-tooltip__swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="compare-tooltip__name">{s.name}</span>
            <span className="compare-tooltip__value">{formatCurrency(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ScenarioCompareChart({ rows, scenarios, selectedMonth, onSelectMonth, height = 260 }) {
  // Press-and-drag scrubs the selected month, the same gesture as the
  // scenario chart.
  const scrubbing = useRef(false)
  const selectFrom = useCallback((state) => {
    const month = state?.activePayload?.[0]?.payload?.month
    if (month && onSelectMonth) onSelectMonth(month)
  }, [onSelectMonth])
  useEffect(() => {
    const end = () => { scrubbing.current = false }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [])

  const values = rows.flatMap(r => scenarios.map(s => r[s.id]).filter(v => v != null))
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = Math.max(max - min, Math.abs(max) * 0.02, 1)
  const yDomain = [Math.round(min - span * 0.12), Math.round(max + span * 0.12)]
  const hasSelected = rows.some(r => r.month === selectedMonth)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={rows}
        margin={{ top: 12, right: 14, left: 14, bottom: 6 }}
        onClick={selectFrom}
        onMouseDown={(state) => { scrubbing.current = true; selectFrom(state) }}
        onMouseMove={(state) => { if (scrubbing.current) selectFrom(state) }}
        onTouchStart={() => { scrubbing.current = true }}
        onTouchMove={(state) => { if (scrubbing.current) selectFrom(state) }}
        style={{ cursor: 'pointer', touchAction: 'pan-y' }}
      >
        <YAxis domain={yDomain} hide />
        <XAxis dataKey="month" hide />
        <Tooltip
          content={<CompareTooltip scenarios={scenarios} />}
          cursor={{ stroke: 'var(--chart-groove)', strokeOpacity: 0.5, strokeWidth: 1 }}
          isAnimationActive={false}
        />
        {hasSelected && (
          <ReferenceLine x={selectedMonth} stroke="var(--chart-grid)" strokeWidth={1} strokeDasharray="3 4" />
        )}
        {/* Projections first so every realised history sits on top of them. */}
        {scenarios.map((s, i) => (
          <Line
            key={`${s.id}:f`}
            type="monotone"
            dataKey={`${s.id}:f`}
            stroke={scenarioColor(i)}
            strokeOpacity={0.85}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeDasharray="2 7"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        ))}
        {historyGroups(rows, scenarios).map(g => (
          <Line
            key={g.dataKey}
            type="monotone"
            dataKey={g.dataKey}
            stroke={g.color}
            strokeWidth={2.4}
            strokeLinecap="round"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
