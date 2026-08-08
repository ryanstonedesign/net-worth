import { describe, expect, it } from 'vitest'
import {
  applyWhatIfChanges,
  buildAskManifest,
  createForecastDataset,
  findCrossing,
  getAssumptions,
  getChange,
  getLargestHistoricalMover,
  getValue,
  simulateWhatIf,
  validateStructuredAnswer,
  validateWhatIfChanges,
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

  it('uses the dashboard 0% default when an account has no saved growth rate', () => {
    const data = sampleData()
    delete data.categories[0].accounts[0].growth
    const dataset = createForecastDataset(data, { currentMonth: '2026-08' })
    const result = getValue(dataset, { targetId: 'portfolio', month: '2027-08' })

    expect(result.status).toBe('ok')
    expect(result.evidence.quality.complete).toBe(false)
    expect(result.evidence.quality.warnings.join(' ')).toContain('0% growth')
    expect(result.evidence.quality.warnings.join(' ')).toContain('Brokerage')
    expect(getAssumptions(dataset).accounts.find(account => account.id === 'brokerage')).toMatchObject({
      growthPercent: 0,
      growthWasDefaulted: true,
      validForForecast: true,
    })
  })

  it('finds a locally computed goal crossing', () => {
    const dataset = createForecastDataset(sampleData(), { currentMonth: '2026-08' })
    const result = findCrossing(dataset, { targetId: 'portfolio', threshold: 10000, direction: 'above' })
    expect(result.status).toBe('ok')
    expect(result.evidence.value).toBeGreaterThanOrEqual(10000)
  })

  it('reports the blocking growth assumption instead of a false goal-horizon result', () => {
    const data = sampleData()
    data.categories[0].accounts[0].growth = '-101'
    const dataset = createForecastDataset(data, { currentMonth: '2026-08' })
    const result = findCrossing(dataset, { targetId: 'portfolio', threshold: 10000, direction: 'above' })

    expect(result.status).toBe('unknown')
    expect(result.reason).toContain('Brokerage')
    expect(result.reason).toContain('-100% or higher')
    expect(result.reason).not.toContain('forecast horizon')
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

  it('excludes never-recorded accounts from historical completeness and totals', () => {
    const data = sampleData()
    data.categories[0].accounts.push({ id: 'future', name: 'Future Fund', growth: '7', monthlyContribution: 100 })
    data.snapshots['2026-09'] = { future: 5000 } // seeded ahead of recorded history
    const dataset = createForecastDataset(data, { currentMonth: '2026-08' })

    expect(dataset.coverage.neverRecordedAccountIds).toEqual(['future'])
    expect(dataset.coverage.incompleteMonths).toEqual([])
    const recorded = getValue(dataset, { targetId: 'portfolio', month: '2026-08' })
    expect(recorded.status).toBe('ok')
    expect(recorded.evidence.value).toBe(1800 + 2300 - 400)
    const history = getValue(dataset, { targetId: 'future', month: '2026-08' })
    expect(history.status).toBe('unknown')
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

function whatIfContext(data = sampleData()) {
  return {
    data,
    currentMonth: '2026-08',
    dataset: createForecastDataset(data, {
      scenarioId: 'default',
      scenarioName: 'Default Scenario',
      currentMonth: '2026-08',
    }),
  }
}

describe('what-if simulation', () => {
  it('validates every op bound before anything is applied', () => {
    const data = sampleData()
    expect(validateWhatIfChanges(data, [], '2026-08').ok).toBe(false)
    expect(validateWhatIfChanges(data, [
      { op: 'set_growth', accountId: 'missing', annualGrowthPercent: 7 },
    ], '2026-08').ok).toBe(false)
    expect(validateWhatIfChanges(data, [
      { op: 'set_growth', accountId: 'brokerage', annualGrowthPercent: 250 },
    ], '2026-08').ok).toBe(false)
    expect(validateWhatIfChanges(data, [
      { op: 'set_contribution', accountId: 'brokerage', monthlyContribution: -50 },
    ], '2026-08').ok).toBe(false) // negative only on liabilities
    expect(validateWhatIfChanges(data, [
      { op: 'set_contribution', accountId: 'visa', monthlyContribution: -50 },
    ], '2026-08').ok).toBe(false) // cards category is not contributing
    expect(validateWhatIfChanges(data, [
      { op: 'add_account', categoryId: 'cards', name: 'Side fund', startingBalance: 100, monthlyContribution: 50, annualGrowthPercent: 5 },
    ], '2026-08').ok).toBe(false) // contribution into a non-contributing category
    expect(validateWhatIfChanges(data, [
      { op: 'one_time_change', accountId: 'brokerage', month: '2025-01', amount: 1000 },
    ], '2026-08').ok).toBe(false) // past month
    expect(validateWhatIfChanges(data, [
      { op: 'set_growth', accountId: 'brokerage', annualGrowthPercent: 9 },
    ], '2026-08').ok).toBe(true)
  })

  it('applies changes to a deep copy without touching the input', () => {
    const data = sampleData()
    const frozen = JSON.stringify(data)
    const applied = applyWhatIfChanges(data, [
      { op: 'set_growth', accountId: 'brokerage', annualGrowthPercent: 9 },
      { op: 'add_account', categoryId: 'investments', name: 'New Fund', startingBalance: 1000, monthlyContribution: 200, annualGrowthPercent: 7 },
    ], { currentMonth: '2026-08' })

    expect(applied.ok).toBe(true)
    expect(JSON.stringify(data)).toBe(frozen)
    const brokerage = applied.data.categories[0].accounts.find(account => account.id === 'brokerage')
    expect(brokerage.growth).toBe('9')
    const added = applied.data.categories[0].accounts.find(account => account.name === 'New Fund')
    expect(added.monthlyContribution).toBe(200)
    // The opening balance is an assumption on the account, never a snapshot.
    expect(added.startingBalance).toBe(1000)
    expect(applied.data.snapshots).toEqual(sampleData().snapshots)
  })

  // Regression: seeding a new account's balance into a snapshot made the
  // unrecorded current month count as recorded history, which read every other
  // account as 0 — and clearing it fanned the deletion out to synced scenarios.
  it('never writes a snapshot for an unrecorded month when adding an account', () => {
    const data = sampleData()
    delete data.snapshots['2026-08'] // this month not recorded yet
    const applied = applyWhatIfChanges(data, [
      { op: 'add_account', categoryId: 'investments', name: 'New Fund', startingBalance: 5000, monthlyContribution: 0, annualGrowthPercent: 7 },
    ], { currentMonth: '2026-08' })

    expect(applied.ok).toBe(true)
    expect(Object.keys(applied.data.snapshots)).toEqual(['2025-08'])
    // The unrecorded month stays unrecorded, so nothing is zeroed.
    const dataset = createForecastDataset(applied.data, { currentMonth: '2026-08' })
    expect(dataset.lastRecordedMonth).toBe('2025-08')
    // The account still starts at its opening balance in the forecast.
    const added = applied.data.categories[0].accounts.find(account => account.name === 'New Fund')
    expect(dataset.models[added.id].base).toBe(5000)
    expect(getValue(dataset, { targetId: added.id, month: '2025-09' }).evidence.value).toBeGreaterThan(5000)
  })

  it('turns a one-time change into a single-month extra contribution', () => {
    const applied = applyWhatIfChanges(sampleData(), [
      { op: 'one_time_change', accountId: 'brokerage', month: '2027-01', amount: 5000 },
    ], { currentMonth: '2026-08' })

    expect(applied.ok).toBe(true)
    // Base contribution is the recorded average (100), plus the windfall.
    expect(applied.data.contributions['2027-01'].brokerage).toBe(5100)
  })

  it('compares baseline and hypothetical values with a derived delta', () => {
    const result = simulateWhatIf(whatIfContext(), {
      changes: [{ op: 'set_contribution', accountId: 'brokerage', monthlyContribution: 300 }],
      metric: 'value_at_month',
      month: '2031-08',
    })

    expect(result.status).toBe('ok')
    const kinds = result.evidence.map(record => record.kind)
    expect(kinds).toEqual(['forecast', 'hypothetical', 'hypothetical'])
    const [base, hypo, delta] = result.evidence
    expect(hypo.value).toBeGreaterThan(base.value)
    expect(delta.metric).toBe('whatIfDelta')
    expect(delta.value).toBe(hypo.value - base.value)
    expect(delta.display).toMatch(/^\+\$/)
    expect(result.appliedChanges[0]).toMatchObject({ op: 'set_contribution', accountName: 'Brokerage' })
  })

  it('reports goal-timing change in months for goal_crossing what-ifs', () => {
    const result = simulateWhatIf(whatIfContext(), {
      changes: [{ op: 'set_contribution', accountId: 'brokerage', monthlyContribution: 500 }],
      metric: 'goal_crossing',
    })

    expect(result.status).toBe('ok')
    const delta = result.evidence.find(record => record.metric === 'goalTimingChange')
    expect(delta.value).toBeLessThan(0)
    expect(delta.display).toContain('earlier')
  })

  it('needs a goal or explicit threshold for goal_crossing', () => {
    const data = sampleData()
    data.goal = null
    const result = simulateWhatIf(whatIfContext(data), {
      changes: [{ op: 'set_contribution', accountId: 'brokerage', monthlyContribution: 500 }],
      metric: 'goal_crossing',
    })
    expect(result.status).toBe('unknown')
    expect(result.reason).toContain('goal')
  })

  it('accepts a future start month and rejects one in the past', () => {
    const data = sampleData()
    const account = {
      op: 'add_account', categoryId: 'investments', name: 'Baby 529',
      startingBalance: 0, monthlyContribution: 500, annualGrowthPercent: 8,
    }
    expect(validateWhatIfChanges(data, [{ ...account, startMonth: '2027-03' }], '2026-08').ok).toBe(true)
    expect(validateWhatIfChanges(data, [{ ...account, startMonth: '2024-01' }], '2026-08').ok).toBe(false)
    expect(validateWhatIfChanges(data, [{ ...account, startMonth: 'soon' }], '2026-08').ok).toBe(false)
    // Omitting it stays valid — the account simply opens right away.
    expect(validateWhatIfChanges(data, [account], '2026-08').ok).toBe(true)
  })

  it('defers a delayed account so it is worth nothing before it opens', () => {
    const changes = [{
      op: 'add_account', categoryId: 'investments', name: 'Baby 529',
      startingBalance: 0, monthlyContribution: 500, annualGrowthPercent: 8,
      startMonth: '2027-03',
    }]
    const context = whatIfContext()
    const before = simulateWhatIf(context, { changes, metric: 'value_at_month', month: '2027-01' })
    const after = simulateWhatIf(context, { changes, metric: 'value_at_month', month: '2040-03' })

    // Before it opens, the hypothetical matches the baseline exactly.
    const beforeDelta = before.evidence.find(record => record.metric === 'whatIfDelta')
    expect(beforeDelta.value).toBe(0)
    // Long after, the gap is the account's own accumulated value.
    const afterDelta = after.evidence.find(record => record.metric === 'whatIfDelta')
    expect(afterDelta.value).toBeGreaterThan(100000)
    expect(after.appliedChanges[0].startMonth).toBe('2027-03')
  })

  it('surfaces validation failures as reasons, not partial application', () => {
    const result = simulateWhatIf(whatIfContext(), {
      changes: [
        { op: 'set_growth', accountId: 'brokerage', annualGrowthPercent: 9 },
        { op: 'set_growth', accountId: 'missing', annualGrowthPercent: 9 },
      ],
      metric: 'value_at_month',
      month: '2031-08',
    })
    expect(result.status).toBe('unknown')
    expect(result.reason).toContain('does not exist')
  })
})
