import { describe, expect, it } from 'vitest'
import {
  answerStarterQuestion,
  buildAskContext,
  collectEvidence,
  deriveWhatIfName,
  executeAskTool,
} from './askWorthfolio'
import { applyWhatIfChanges, createForecastDataset, getValue } from './forecastInsights'

function data() {
  return {
    categories: [{
      id: 'assets', name: 'Assets', type: 'asset', contributing: true,
      accounts: [{ id: 'savings', name: 'Savings', growth: '5' }],
    }],
    snapshots: {
      '2025-08': { savings: 10000 },
      '2026-08': { savings: 13000 },
    },
    contributions: {
      '2025-08': { savings: 100 },
      '2026-08': { savings: 100 },
    },
    goal: 25000,
  }
}

function context() {
  const scenarioData = data()
  const hook = {
    activeForecastId: 'default',
    data: scenarioData,
    forecasts: [{ id: 'default', name: 'Default Scenario', linked: true }],
    getForecastData: () => scenarioData,
  }
  return buildAskContext(hook, 'Default Scenario', '2026-08')
}

describe('Ask Worthfolio local orchestration', () => {
  it('answers the ten-year starter without a network request', () => {
    const result = answerStarterQuestion('ten_years', context())
    expect(result.answer.status).toBe('answered')
    expect(result.evidence[0].kind).toBe('forecast')
    expect(result.evidence[0].month).toBe('2036-08')
  })

  it('answers imported-account forecasts with a visible 0% growth warning', () => {
    const scenarioData = data()
    delete scenarioData.categories[0].accounts[0].growth
    const hook = {
      activeForecastId: 'default',
      data: scenarioData,
      forecasts: [{ id: 'default', name: 'Default Scenario', linked: true }],
      getForecastData: () => scenarioData,
    }
    const result = answerStarterQuestion(
      'ten_years',
      buildAskContext(hook, 'Default Scenario', '2026-08'),
    )

    expect(result.answer.status).toBe('answered')
    expect(result.evidence[0].quality.warnings.join(' ')).toContain('0% growth')
  })

  it('names a scenario whose invalid assumptions prevent comparison', () => {
    const defaultData = data()
    delete defaultData.categories[0].accounts[0].growth
    const invalidData = structuredClone(data())
    invalidData.categories[0].accounts[0].growth = '-101'
    const scenarioData = { default: defaultData, invalid: invalidData }
    const hook = {
      activeForecastId: 'default',
      data: defaultData,
      forecasts: [
        { id: 'default', name: 'Default Scenario', linked: true },
        { id: 'invalid', name: 'Broken Growth', linked: true },
      ],
      getForecastData: id => scenarioData[id],
    }
    const result = answerStarterQuestion(
      'compare_scenarios',
      buildAskContext(hook, 'Default Scenario', '2026-08'),
    )

    expect(result.answer.status).toBe('answered')
    expect(result.answer.explanation).toContain('Broken Growth')
    expect(result.answer.explanation).toContain('-100% or higher')
    expect(result.evidence).toHaveLength(1)
  })

  it('executes an allowlisted local tool and collects only evidence records', () => {
    const result = executeAskTool('get_change', {
      targetId: 'savings', from: '2025-08', to: '2026-08',
    }, context())
    expect(result.status).toBe('ok')
    expect(result.evidence.value).toBe(3000)
    expect(collectEvidence(result).map(record => record.id)).toContain(result.evidence.id)
  })

  it('rejects tools outside the local allowlist', () => {
    expect(executeAskTool('delete_account', {}, context())).toEqual({
      status: 'error', error: 'Unsupported local tool.',
    })
  })

  it('simulates a what-if through the tool allowlist and echoes the validated spec', () => {
    const result = executeAskTool('simulate_what_if', {
      changes: [{
        op: 'add_account', categoryId: 'assets', name: 'Roth IRA',
        startingBalance: 1000, monthlyContribution: 500, annualGrowthPercent: 7,
      }],
      metric: 'value_at_month',
      month: '2036-08',
    }, context())

    expect(result.status).toBe('ok')
    expect(result.evidence.map(record => record.kind)).toEqual(['forecast', 'hypothetical', 'hypothetical'])
    expect(result.appliedChanges[0].name).toBe('Roth IRA')
    expect(collectEvidence(result)).toHaveLength(3)
  })

  it('answers the save-more starter as an unsaved hypothetical', () => {
    const result = answerStarterQuestion('save_more', context())
    expect(result.answer.status).toBe('answered')
    expect(result.answer.caveatCodes).toContain('HYPOTHETICAL_NOT_SAVED')
    expect(result.whatIf.changes[0]).toMatchObject({ op: 'set_contribution', accountId: 'savings', monthlyContribution: 300 })
  })

  it('derives a deterministic scenario name from the applied changes', () => {
    expect(deriveWhatIfName([
      { op: 'add_account', name: 'Roth IRA', monthlyContribution: 500, annualGrowthPercent: 7 },
      { op: 'set_growth', accountName: 'Savings', annualGrowthPercent: 9 },
    ])).toBe('What if: +Roth IRA $500/mo @ 7%, Savings @ 9%')
  })

  // The trust invariant: a scenario saved from a what-if must reproduce the
  // simulated answer exactly — same changes spec, same engine, same numbers.
  it('materializes a saved scenario that matches the simulation', () => {
    const ctx = context()
    const changes = [
      { op: 'add_account', categoryId: 'assets', name: 'Roth IRA', startingBalance: 1000, monthlyContribution: 500, annualGrowthPercent: 7 },
      { op: 'set_growth', accountId: 'savings', annualGrowthPercent: 9 },
      { op: 'one_time_change', accountId: 'savings', month: '2028-01', amount: 20000 },
    ]
    const month = '2036-08'
    const simulated = executeAskTool('simulate_what_if', { changes, metric: 'value_at_month', month }, ctx)
    expect(simulated.status).toBe('ok')
    const hypothetical = simulated.evidence.find(record => record.metric === 'netWorth' && record.kind === 'hypothetical')

    // Materialize the way useData.addForecastFromWhatIf does: same function,
    // real minted account ids.
    const saved = applyWhatIfChanges(ctx.data, changes, {
      currentMonth: '2026-08',
      mintAccountId: index => `acc_12345_${index}`,
    })
    expect(saved.ok).toBe(true)
    const savedDataset = createForecastDataset(saved.data, {
      scenarioId: 'saved', scenarioName: 'Saved What-if', currentMonth: '2026-08',
    })
    const savedValue = getValue(savedDataset, { targetId: 'portfolio', month })

    expect(savedValue.status).toBe('ok')
    expect(savedValue.evidence.value).toBe(hypothetical.value)
  })
})
