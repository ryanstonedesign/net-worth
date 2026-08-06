import { describe, expect, it } from 'vitest'
import {
  answerStarterQuestion,
  buildAskContext,
  collectEvidence,
  executeAskTool,
} from './askWorthfolio'

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
})
