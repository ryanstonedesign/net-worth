import { describe, expect, it } from 'vitest'
import { compareSeries, scenarioSeries, scenarioValueAt } from './scenarioSeries'

const categories = [
  { id: 'a', name: 'Assets', type: 'asset', contributing: true, accounts: [{ id: 'cash', name: 'Cash', growth: '0' }] },
  { id: 'l', name: 'Loans', type: 'liability', contributing: false, accounts: [{ id: 'loan', name: 'Loan', growth: '0' }] },
]

function data(values, contribution = 100) {
  const snapshots = {}
  const contributions = {}
  Object.entries(values).forEach(([month, [cash, loan]]) => {
    snapshots[month] = { cash, loan }
    contributions[month] = { cash: contribution }
  })
  return { categories, snapshots, contributions }
}

const steady = data({ '2026-08': [1000, 200], '2026-09': [1100, 200], '2026-10': [1200, 200] })
const lean = data({ '2026-08': [500, 0], '2026-09': [500, 0], '2026-10': [500, 0] }, 0)

describe('scenarioSeries', () => {
  it('splits recorded history from the projection', () => {
    const { history, forecast, lastMonth } = scenarioSeries(steady, '2026-10', 2)
    expect(lastMonth).toBe('2026-10')
    expect(history.map(h => h.netWorth)).toEqual([800, 900, 1000])
    // Zero growth, $100/mo average contribution on the asset.
    expect(forecast).toEqual([
      { month: '2026-11', netWorth: 1100 },
      { month: '2026-12', netWorth: 1200 },
    ])
  })

  it('ignores months after the current month as history', () => {
    const future = data({ '2026-09': [100, 0], '2026-12': [999, 0] })
    expect(scenarioSeries(future, '2026-10', 0).history.map(h => h.month)).toEqual(['2026-09'])
  })
})

describe('compareSeries', () => {
  const scenarios = [{ id: 's1', name: 'Steady', data: steady }, { id: 's2', name: 'Lean', data: lean }]

  it('puts every scenario on one month axis with joined history and projection', () => {
    const { rows, lastMonth } = compareSeries(scenarios, { currentMonth: '2026-10', range: '3M' })
    expect(lastMonth).toBe('2026-10')
    expect(rows.map(r => r.month)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'])
    const today = rows.find(r => r.month === '2026-10')
    // The last real month carries both halves so the solid and dashed lines meet.
    expect(today['s1:h']).toBe(1000)
    expect(today['s1:f']).toBe(1000)
    expect(today.isForecast).toBe(false)
    const next = rows.find(r => r.month === '2026-11')
    expect(next['s1:h']).toBeUndefined()
    expect(next.s1).toBe(1100)
    expect(next.s2).toBe(500)
    expect(next.isForecast).toBe(true)
  })

  it('reaches a selected month outside the range', () => {
    const { rows } = compareSeries(scenarios, { currentMonth: '2026-10', range: '1M', selectedMonth: '2027-03' })
    expect(rows.at(-1).month).toBe('2027-03')
  })

  it('is empty when no scenario has history', () => {
    expect(compareSeries([{ id: 'x', name: 'Empty', data: { categories: [], snapshots: {} } }], { currentMonth: '2026-10' }))
      .toEqual({ rows: [], lastMonth: null })
  })
})

describe('scenarioValueAt', () => {
  it('returns recorded, projected, or no value', () => {
    expect(scenarioValueAt(steady, '2026-09', '2026-10')).toEqual({ value: 900, estimated: false })
    expect(scenarioValueAt(steady, '2026-12', '2026-10')).toEqual({ value: 1200, estimated: true })
    expect(scenarioValueAt(steady, '2026-01', '2026-10')).toBeNull()
  })
})
