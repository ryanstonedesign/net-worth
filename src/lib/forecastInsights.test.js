import { describe, expect, it } from 'vitest'
import {
  buildAskManifest,
  createForecastDataset,
  findCrossing,
  getChange,
  getLargestHistoricalMover,
  getValue,
  validateStructuredAnswer,
} from './forecastInsights'

function sampleData() {
  return {
    categories: [
      {
        id: 'investments', name: 'Investments', type: 'asset', contributing: true,
        accounts: [
          { id: 'brokerage', name: 'Brokerage', growth: '6' },
          { id: 'roth', name: 'Roth IRA', growth: '6' },
        ],
      },
      {
        id: 'cards', name: 'Credit cards', type: 'liability', contributing: false,
        accounts: [{ id: 'visa', name: 'Visa', growth: '-50' }],
      },
    ],
    snapshots: {
      '2025-08': { brokerage: 1000, roth: 2000, visa: 800 },
      '2026-08': { brokerage: 1800, roth: 2300, visa: 400 },
    },
    contributions: {
      '2025-08': { brokerage: 100, roth: 50 },
      '2026-08': { brokerage: 100, roth: 50 },
    },
    goal: 10000,
  }
}

describe('forecast insight evidence', () => {
  it('refuses to turn missing recorded balances into zero', () => {
    const data = sampleData()
    delete data.snapshots['2026-08'].roth
    const dataset = createForecastDataset(data, { currentMonth: '2026-08' })
    const result = getValue(dataset, { targetId: 'portfolio', month: '2026-08' })
    expect(result.status).toBe('unknown')
    expect(result.quality.missingAccountIds).toContain('roth')
  })

  it('returns canonical evidence for forecast values', () => {
    const dataset = createForecastDataset(sampleData(), { currentMonth: '2026-08' })
    const result = getValue(dataset, { targetId: 'brokerage', month: '2027-08' })
    expect(result.status).toBe('ok')
    expect(result.evidence.kind).toBe('forecast')
    expect(result.evidence.targetName).toBe('Brokerage')
    expect(result.evidence.display).toMatch(/^\$/)
  })

  it('finds a locally computed goal crossing', () => {
    const dataset = createForecastDataset(sampleData(), { currentMonth: '2026-08' })
    const result = findCrossing(dataset, { targetId: 'portfolio', threshold: 10000, direction: 'above' })
    expect(result.status).toBe('ok')
    expect(result.evidence.value).toBeGreaterThanOrEqual(10000)
  })

  it('finds the largest complete historical mover', () => {
    const dataset = createForecastDataset(sampleData(), { currentMonth: '2026-08' })
    const result = getLargestHistoricalMover(dataset)
    expect(result.status).toBe('ok')
    expect(result.evidence.targetId).toBe('brokerage')
    expect(result.evidence.value).toBe(800)
  })

  it('computes balance changes locally and retains endpoint evidence', () => {
    const dataset = createForecastDataset(sampleData(), { currentMonth: '2026-08' })
    const result = getChange(dataset, { targetId: 'brokerage', from: '2025-08', to: '2026-08' })
    expect(result.status).toBe('ok')
    expect(result.evidence.value).toBe(800)
    expect(result.endpoints).toHaveLength(2)
  })

  it('keeps balances out of the language manifest', () => {
    const manifest = buildAskManifest({
      data: sampleData(),
      scenarioId: 'default',
      scenarioName: 'Default Scenario',
      currentMonth: '2026-08',
    })
    expect(JSON.stringify(manifest)).not.toContain('2300')
    expect(manifest.categories[0].accounts[1].name).toBe('Roth IRA')
  })

  it('rejects unknown evidence and prose-authored financial numbers', () => {
    const evidence = { id: 'known', display: '$1,000' }
    expect(validateStructuredAnswer({
      status: 'answered', intro: 'Your projected value is', facts: [{ evidenceId: 'missing' }], evidenceIds: [],
    }, [evidence]).ok).toBe(false)
    expect(validateStructuredAnswer({
      status: 'answered', intro: 'Your value is $1,000', facts: [{ evidenceId: 'known' }], evidenceIds: ['known'],
    }, [evidence]).ok).toBe(false)
  })
})
