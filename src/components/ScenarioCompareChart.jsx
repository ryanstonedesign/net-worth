import { useCallback, useEffect, useRef } from 'react'
import { LineChart, Line, ResponsiveContainer, ReferenceLine, YAxis, XAxis } from 'recharts'

// Every scenario on one plot for the Home screen, drawn the way the scenario
// chart draws one: solid history, dashed projection, same stroke weight. There
// are no month markers — with several lines they only crowd each other, and no
// popover: the totals live in the card under the chart. Pressing or dragging
// across the plot moves the selected month, which that card follows.
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

  // Every drawn point counts toward the scale, including the $0 lead-ins.
  const values = rows.flatMap(r => scenarios.flatMap(s => [r[`${s.id}:h`], r[`${s.id}:f`]]).filter(v => v != null))
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
