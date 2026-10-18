// History and projection for every scenario, on one shared month axis, for
// the Home comparison chart and its scenario cards. Each scenario runs through
// the same model the scenario Dashboard draws (buildAccountModels +
// generateForecast), so a line on Home always matches that scenario's own chart.
import { dataHistory, getAdjacentMonth } from '../utils'
import { buildAccountModels, customForecastCount, generateForecast, monthIndex } from './forecast'

export const RANGE_OPTIONS = ['1M', '3M', '6M', '1Y', 'custom']
// History months shown per range, and months projected ahead.
export const RANGE_COUNTS = { '1M': 2, '3M': 3, '6M': 6, '1Y': 12 }
export const FORECAST_MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }

// One scenario's real history (months up to `currentMonth` with recorded
// balances) and its projection `forecastCount` months past the last of them.
export function scenarioSeries(data, currentMonth, forecastCount) {
  const d = data || { categories: [], snapshots: {} }
  const history = dataHistory(d).filter(h => h.month <= currentMonth)
  const last = history.length ? history[history.length - 1].month : null
  if (!last || forecastCount < 1) return { history, forecast: [], lastMonth: last }
  const models = buildAccountModels(d.categories, d.snapshots, d.contributions || {}, history.map(h => h.month), currentMonth)
  const forecast = generateForecast(d.categories, models, d.snapshots, d.contributions || {}, last, forecastCount)
    .map(({ month, netWorth }) => ({ month, netWorth }))
  return { history, forecast, lastMonth: last }
}

// All scenarios on one axis. Returns:
//   rows      – one per month, oldest first: { month, isForecast, [id]: value,
//               [`${id}:h`]: history value, [`${id}:f`]: projection value }.
//               The :h/:f keys split each line into its solid and dashed
//               parts; they share the scenario's last real month so the two
//               halves join. `isForecast` is true once every scenario is past
//               its own history.
//   lastMonth – the latest real month across scenarios (the "today" point).
export function compareSeries(scenarios, { currentMonth, range = '1Y', customYear, selectedMonth } = {}) {
  const lastMonths = []
  const base = scenarios.map(s => {
    const { history } = scenarioSeries(s.data, currentMonth, 0)
    const last = history.length ? history[history.length - 1].month : null
    if (last) lastMonths.push(last)
    return { ...s, last }
  })
  const lastMonth = lastMonths.length ? lastMonths.sort().at(-1) : null
  if (!lastMonth) return { rows: [], lastMonth: null }

  // Same horizon rules as the scenario Dashboard: the range sets it, and it
  // always stretches to reach a month the user has moved to.
  const rangeCount = range === 'custom'
    ? customForecastCount(lastMonth, parseInt(customYear, 10))
    : FORECAST_MONTHS[range] ?? 1
  const reach = selectedMonth ? monthIndex(selectedMonth) - monthIndex(lastMonth) : 0
  const ahead = Math.max(rangeCount, reach, 0)
  const endMonth = getAdjacentMonth(lastMonth, ahead)

  const historyCount = range === 'custom' ? Infinity : RANGE_COUNTS[range] ?? 12
  let startMonth = historyCount === Infinity
    ? null
    : getAdjacentMonth(lastMonth, -(historyCount - 1))
  if (selectedMonth && startMonth && selectedMonth < startMonth) startMonth = selectedMonth

  const byMonth = new Map()
  const row = (month) => {
    if (!byMonth.has(month)) byMonth.set(month, { month })
    return byMonth.get(month)
  }

  for (const s of base) {
    if (!s.last) continue
    const span = monthIndex(endMonth) - monthIndex(s.last)
    const { history, forecast } = scenarioSeries(s.data, currentMonth, span)
    for (const h of history) {
      if (startMonth && h.month < startMonth) continue
      const r = row(h.month)
      r[s.id] = h.netWorth
      r[`${s.id}:h`] = h.netWorth
      if (h.month === s.last) r[`${s.id}:f`] = h.netWorth
    }
    for (const f of forecast) {
      const r = row(f.month)
      r[s.id] = f.netWorth
      r[`${s.id}:f`] = f.netWorth
    }
  }

  const rows = [...byMonth.values()]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map(r => ({ ...r, isForecast: r.month > lastMonth }))
  return { rows, lastMonth }
}

// A scenario's total at `month`: its recorded value where it has one,
// otherwise its projection. Null before its history starts.
export function scenarioValueAt(data, month, currentMonth) {
  const { history, lastMonth } = scenarioSeries(data, currentMonth, 0)
  if (!lastMonth || month < history[0].month) return null
  const recorded = history.find(h => h.month === month)
  if (recorded) return { value: recorded.netWorth, estimated: false }
  if (month < lastMonth) {
    // A gap inside the history: carry the last recorded value forward.
    const prior = history.filter(h => h.month < month).at(-1)
    return { value: prior.netWorth, estimated: false }
  }
  const span = monthIndex(month) - monthIndex(lastMonth)
  const { forecast } = scenarioSeries(data, currentMonth, span)
  const hit = forecast.find(f => f.month === month)
  return hit ? { value: hit.netWorth, estimated: true } : null
}
