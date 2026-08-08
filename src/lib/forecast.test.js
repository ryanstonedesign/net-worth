import { describe, expect, it } from 'vitest'
import {
  MAX_FORECAST_MONTHS,
  buildAccountModels,
  customForecastCount,
  generateForecast,
  monthIndex,
} from './forecast'

const categories = [
  {
    id: 'assets',
    name: 'Assets',
    type: 'asset',
    contributing: true,
    accounts: [{ id: 'brokerage', name: 'Brokerage', growth: '12' }],
  },
  {
    id: 'debts',
    name: 'Debts',
    type: 'liability',
    contributing: false,
    accounts: [{ id: 'visa', name: 'Visa', growth: '-12' }],
  },
]

describe('forecast primitives', () => {
  it('validates and indexes month strings', () => {
    expect(monthIndex('2026-01')).toBe(2026 * 12)
    expect(monthIndex('2026-12')).toBe(2026 * 12 + 11)
    expect(monthIndex('2026-13')).toBeNull()
    expect(monthIndex('not-a-month')).toBeNull()
  })

  it('bounds custom forecasts to the shared ceiling', () => {
    expect(customForecastCount('2026-08', 2027)).toBe(16)
    expect(customForecastCount('2026-08', 2200)).toBe(MAX_FORECAST_MONTHS)
    expect(customForecastCount(null, 2030)).toBe(0)
  })

  it('builds models from the latest balances and recorded contributions', () => {
    const models = buildAccountModels(
      categories,
      {
        '2026-01': { brokerage: 1000, visa: 500 },
        '2026-02': { brokerage: 1200, visa: 450 },
      },
      {
        '2026-01': { brokerage: 100 },
        '2026-02': { brokerage: 200 },
        '2027-01': { brokerage: 9999 },
      },
      ['2026-01', '2026-02'],
      '2026-02',
    )

    expect(models.brokerage.base).toBe(1200)
    expect(models.brokerage.contribution).toBe(150)
    expect(models.brokerage.annual).toBe(0.12)
    expect(models.visa.base).toBe(450)
    expect(models.visa.contribution).toBe(0)
  })

  it('prefers an explicit monthlyContribution assumption over the recorded average', () => {
    const withOverride = [
      {
        ...categories[0],
        accounts: [{ id: 'brokerage', name: 'Brokerage', growth: '12', monthlyContribution: 500 }],
      },
      categories[1],
    ]
    const models = buildAccountModels(
      withOverride,
      { '2026-01': { brokerage: 1000, visa: 500 } },
      { '2026-01': { brokerage: 100 } },
      ['2026-01'],
      '2026-01',
    )

    expect(models.brokerage.contribution).toBe(500)
  })

  it('lets an account with no contribution history contribute via the explicit assumption', () => {
    const withNewAccount = [
      {
        ...categories[0],
        accounts: [
          ...categories[0].accounts,
          { id: 'roth', name: 'Roth IRA', growth: '7', monthlyContribution: 250 },
        ],
      },
      categories[1],
    ]
    const models = buildAccountModels(withNewAccount, {}, {}, [], '2026-01')

    expect(models.roth.base).toBe(0)
    expect(models.roth.contribution).toBe(250)
  })

  it('opens a history-less account at its explicit startingBalance', () => {
    const withOpeningBalance = [
      {
        ...categories[0],
        accounts: [{ id: 'roth', name: 'Roth IRA', growth: '7', startingBalance: 5000 }],
      },
    ]
    const models = buildAccountModels(
      withOpeningBalance,
      { '2026-01': {} },
      {},
      ['2026-01'],
      '2026-01',
    )
    expect(models.roth.base).toBe(5000)
  })

  it('prefers recorded history over startingBalance once the account has any', () => {
    const withBoth = [
      {
        ...categories[0],
        accounts: [{ id: 'roth', name: 'Roth IRA', growth: '7', startingBalance: 5000 }],
      },
    ]
    const models = buildAccountModels(
      withBoth,
      { '2026-01': { roth: 8000 } },
      {},
      ['2026-01'],
      '2026-01',
    )
    expect(models.roth.base).toBe(8000)
  })

  it('applies balance and contribution overrides with chart-compatible math', () => {
    const models = buildAccountModels(
      categories,
      { '2026-01': { brokerage: 1200, visa: 450 } },
      { '2026-01': { brokerage: 100 } },
      ['2026-01'],
      '2026-01',
    )
    const forecast = generateForecast(
      categories,
      models,
      { '2026-02': { visa: 400 } },
      { '2026-02': { brokerage: 250 } },
      '2026-01',
      2,
    )

    expect(forecast).toHaveLength(2)
    expect(forecast[0].month).toBe('2026-02')
    expect(forecast[0].accounts.visa).toBe(400)
    expect(forecast[0].accounts.brokerage).toBeGreaterThan(1450)
    expect(forecast[0].netWorth).toBe(forecast[0].accounts.brokerage - 400)
    expect(forecast[1].accounts.visa).toBeLessThan(400)
  })
})
