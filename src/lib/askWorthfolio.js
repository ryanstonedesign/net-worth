import { supabase } from './supabase'
import {
  PORTFOLIO_TARGET,
  buildAskManifest,
  compareScenarioValues,
  createForecastDataset,
  findCrossing,
  getAssumptions,
  getChange,
  getLargestHistoricalMover,
  getSeries,
  getValue,
  simulateWhatIf,
  validateStructuredAnswer,
} from './forecastInsights'
import { formatMonthDisplay, getAdjacentMonth, getCurrentMonth } from '../utils'

const CONSENT_PREFIX = 'worthfolio_ask_consent_v1'
const THREAD_PREFIX = 'worthfolio_ask_thread_v1'
const MAX_THREAD_MESSAGES = 40
const MAX_THREAD_CHARACTERS = 24_000
const MAX_TOOL_RESULT_CHARACTERS = 40_000

export const STARTER_QUESTIONS = [
  { id: 'ten_years', label: 'What might my net worth be in 10 years?' },
  { id: 'goal_timing', label: 'When might I reach my goal?' },
  { id: 'largest_mover', label: 'What changed my net worth the most?' },
  { id: 'compare_scenarios', label: 'Compare my scenarios in 10 years' },
  { id: 'save_more', label: 'What if I saved $200 more each month?' },
]

function storageKey(prefix, userKey, scenarioId = '') {
  return `${prefix}:${userKey || 'guest'}${scenarioId ? `:${scenarioId}` : ''}`
}

export function hasAskConsent(userKey) {
  try { return localStorage.getItem(storageKey(CONSENT_PREFIX, userKey)) === 'yes' } catch { return false }
}

export function setAskConsent(userKey, enabled) {
  try {
    const key = storageKey(CONSENT_PREFIX, userKey)
    if (enabled) localStorage.setItem(key, 'yes')
    else localStorage.removeItem(key)
  } catch {}
}

export function loadAskThread(userKey, scenarioId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(THREAD_PREFIX, userKey, scenarioId)) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function trimThread(messages) {
  const trimmed = messages.slice(-MAX_THREAD_MESSAGES)
  let total = trimmed.reduce((sum, message) => sum + String(message.text || '').length, 0)
  while (trimmed.length > 2 && total > MAX_THREAD_CHARACTERS) {
    const removed = trimmed.splice(0, 2)
    total -= removed.reduce((sum, message) => sum + String(message.text || '').length, 0)
  }
  return trimmed
}

export function saveAskThread(userKey, scenarioId, messages) {
  const trimmed = trimThread(messages)
  try {
    localStorage.setItem(storageKey(THREAD_PREFIX, userKey, scenarioId), JSON.stringify(trimmed))
  } catch {}
  return trimmed
}

export function clearAskThread(userKey, scenarioId) {
  try { localStorage.removeItem(storageKey(THREAD_PREFIX, userKey, scenarioId)) } catch {}
}

export function clearAllAskThreads(userKey) {
  try {
    const prefix = storageKey(THREAD_PREFIX, userKey)
    const matches = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(`${prefix}:`)) matches.push(key)
    }
    matches.forEach(key => localStorage.removeItem(key))
  } catch {}
}

export function buildAskContext(dataHook, scenarioName, currentMonth = getCurrentMonth()) {
  const activeScenario = { id: dataHook.activeForecastId, name: scenarioName }
  const scenarios = dataHook.forecasts.map(scenario => ({
    ...scenario,
    data: dataHook.getForecastData(scenario.id),
  }))
  const dataset = createForecastDataset(dataHook.data, {
    scenarioId: activeScenario.id,
    scenarioName: activeScenario.name,
    currentMonth,
  })

  return {
    activeScenario,
    currentMonth,
    data: dataHook.data,
    dataset,
    scenarios,
    manifest: buildAskManifest({
      data: dataHook.data,
      scenarioId: activeScenario.id,
      scenarioName: activeScenario.name,
      scenarios,
      currentMonth,
    }),
  }
}

export function collectEvidence(result) {
  const records = []
  const seen = new Set()
  const visit = value => {
    if (!value || typeof value !== 'object') return
    if (value.id && value.kind && value.metric && !seen.has(value.id)) {
      seen.add(value.id)
      records.push(value)
      return
    }
    if (Array.isArray(value)) value.forEach(visit)
    else Object.values(value).forEach(visit)
  }
  visit(result)
  return records
}

export function executeAskTool(name, args, context) {
  switch (name) {
    case 'get_value':
      return getValue(context.dataset, args)
    case 'get_series':
      return getSeries(context.dataset, args)
    case 'find_crossing':
      return findCrossing(context.dataset, args)
    case 'get_change':
      return getChange(context.dataset, args)
    case 'get_largest_mover':
      return getLargestHistoricalMover(context.dataset, args.windowMonths)
    case 'compare_scenarios': {
      const requested = Array.isArray(args.scenarioIds) && args.scenarioIds.length
        ? context.scenarios.filter(scenario => args.scenarioIds.includes(scenario.id))
        : context.scenarios
      return compareScenarioValues({ scenarios: requested, month: args.month, currentMonth: context.currentMonth })
    }
    case 'get_assumptions':
      return getAssumptions(context.dataset, args.targetIds)
    case 'simulate_what_if':
      return simulateWhatIf(context, args)
    case 'respond_without_data':
      return { status: args.status, message: args.message }
    default:
      return { status: 'error', error: 'Unsupported local tool.' }
  }
}

function gatewayError(error) {
  const message = error?.context?.error || error?.message
  return new Error(message || 'Ask Worthfolio is temporarily unavailable.')
}

async function invokeGateway(body) {
  if (!supabase) throw new Error('Sign in to use Ask Worthfolio.')
  const { data, error } = await supabase.functions.invoke('ask-worthfolio', { body })
  if (error) throw gatewayError(error)
  if (!data || typeof data !== 'object') throw new Error('The AI gateway returned an invalid response.')
  return data
}

export async function askWorthfolio(question, context, transcript = []) {
  const first = await invokeGateway({
    phase: 'interpret',
    question,
    manifest: context.manifest,
    transcript: transcript.slice(-8).map(message => ({ role: message.role, text: message.text })),
  })

  if (first.type !== 'tool_call' || !first.name || !first.arguments) {
    throw new Error('Worthfolio could not map that question to a supported insight.')
  }

  const toolResult = executeAskTool(first.name, first.arguments, context)
  if (first.name === 'respond_without_data') {
    return {
      answer: {
        status: toolResult.status,
        intro: toolResult.message,
        facts: [],
        explanation: '',
        caveatCodes: [],
        evidenceIds: [],
      },
      evidence: [],
    }
  }

  const encodedResult = JSON.stringify(toolResult)
  if (encodedResult.length > MAX_TOOL_RESULT_CHARACTERS) {
    throw new Error('That question needs more data than Ask Worthfolio can safely send in one answer.')
  }

  const evidence = collectEvidence(toolResult)
  if (!evidence.length || toolResult.status !== 'ok') {
    return {
      answer: {
        status: 'insufficient_data',
        intro: toolResult.reason || toolResult.error || 'There is not enough complete data to answer that yet.',
        facts: [],
        explanation: '',
        caveatCodes: [],
        evidenceIds: [],
      },
      evidence: [],
    }
  }

  const second = await invokeGateway({
    phase: 'answer',
    continuation: first.continuation,
    toolResult,
  })
  const validation = validateStructuredAnswer(second.answer, evidence)
  if (!validation.ok) throw new Error('Worthfolio could not verify the answer against your data.')

  // What-if answers carry their validated changes spec so the UI can offer
  // "Save as scenario" — the spec is replayed locally, never re-parsed.
  const whatIf = first.name === 'simulate_what_if' && Array.isArray(toolResult.appliedChanges)
    ? { changes: toolResult.appliedChanges }
    : null
  return whatIf
    ? { answer: second.answer, evidence, whatIf }
    : { answer: second.answer, evidence }
}

function answered(intro, evidence, explanation, caveatCodes = []) {
  const records = Array.isArray(evidence) ? evidence : [evidence]
  return {
    answer: {
      status: 'answered',
      intro,
      facts: records.map(record => ({ evidenceId: record.id })),
      explanation,
      caveatCodes,
      evidenceIds: records.map(record => record.id),
    },
    evidence: records,
  }
}

function unavailable(message) {
  return {
    answer: {
      status: 'insufficient_data', intro: message, facts: [], explanation: '', caveatCodes: [], evidenceIds: [],
    },
    evidence: [],
  }
}

function scenarioGapSummary(gaps = []) {
  return gaps
    .map(gap => `${gap.scenarioName || gap.scenarioId}: ${gap.reason || 'Forecast unavailable.'}`)
    .join(' ')
}

export function answerStarterQuestion(starterId, context) {
  if (starterId === 'ten_years') {
    if (!context.dataset.lastRecordedMonth) return unavailable('Add a recorded balance month before asking for a forecast.')
    const month = getAdjacentMonth(context.dataset.lastRecordedMonth, 120)
    const result = getValue(context.dataset, { targetId: PORTFOLIO_TARGET, month })
    if (result.status !== 'ok') return unavailable(result.reason || 'That forecast is not available.')
    return answered(
      'At your current assumptions, your projected net worth is',
      result.evidence,
      `This is the ${formatMonthDisplay(month)} value in ${context.activeScenario.name}.`,
      ['FORECAST_ASSUMPTIONS'],
    )
  }

  if (starterId === 'goal_timing') {
    if (!Number.isFinite(context.data.goal) || context.data.goal <= 0) return unavailable('Set a net worth goal before asking when you might reach it.')
    const result = findCrossing(context.dataset, {
      targetId: PORTFOLIO_TARGET,
      threshold: context.data.goal,
      direction: 'above',
    })
    if (result.status !== 'ok') return unavailable(result.reason || 'Your goal is not reached within the supported forecast.')
    return answered(
      'Your current scenario first models your goal being reached at',
      result.evidence,
      `${formatMonthDisplay(result.evidence.month)}, if the saved assumptions continue.`,
      ['FORECAST_ASSUMPTIONS'],
    )
  }

  if (starterId === 'largest_mover') {
    const result = getLargestHistoricalMover(context.dataset)
    if (result.status !== 'ok') return unavailable(result.reason || 'There is not enough history for this comparison.')
    return answered(
      `${result.evidence.targetName} had the largest absolute recorded balance change:`,
      result.evidence,
      `Measured from ${formatMonthDisplay(result.evidence.fromMonth)} through ${formatMonthDisplay(result.evidence.month)}. This is balance change, not investment return.`,
      ['BALANCE_CHANGE_NOT_RETURN'],
    )
  }

  if (starterId === 'compare_scenarios') {
    if (context.scenarios.length < 2) return unavailable('Create another scenario before asking for a comparison.')
    if (!context.dataset.lastRecordedMonth) return unavailable('Add a recorded balance month before comparing forecasts.')
    const month = getAdjacentMonth(context.dataset.lastRecordedMonth, 120)
    const result = compareScenarioValues({ scenarios: context.scenarios, month, currentMonth: context.currentMonth })
    const gapSummary = scenarioGapSummary(result.gaps)
    if (result.status !== 'ok') {
      return unavailable(`The scenarios could not be compared. ${gapSummary}`.trim())
    }
    return answered(
      `Here is how your scenarios compare in ${formatMonthDisplay(month)}:`,
      result.evidence,
      [
        'Each value uses that scenario’s own saved growth and contribution assumptions.',
        gapSummary ? `Not shown: ${gapSummary}` : '',
      ].filter(Boolean).join(' '),
      ['FORECAST_ASSUMPTIONS'],
    )
  }

  if (starterId === 'save_more') {
    if (!context.dataset.lastRecordedMonth) return unavailable('Add a recorded balance month before exploring what-ifs.')
    const candidates = context.dataset.accountEntries
      .filter(({ category }) => category.contributing && category.type !== 'liability')
      .map(({ account }) => ({ account, contribution: context.dataset.models[account.id]?.contribution || 0 }))
      .sort((a, b) => b.contribution - a.contribution)
    if (!candidates.length) return unavailable('Add an account in a contributing category before exploring this what-if.')

    const target = candidates[0]
    const month = getAdjacentMonth(context.dataset.lastRecordedMonth, 120)
    const result = simulateWhatIf(context, {
      changes: [{
        op: 'set_contribution',
        accountId: target.account.id,
        monthlyContribution: Math.round(target.contribution) + 200,
      }],
      metric: 'value_at_month',
      month,
    })
    if (result.status !== 'ok') return unavailable(result.reason || 'That what-if could not be evaluated.')
    const response = answered(
      'Here is your projected net worth with an extra monthly contribution, next to your current path:',
      result.evidence,
      `The what-if adds it to ${target.account.name}, your largest contributing account, in ${formatMonthDisplay(month)}. Nothing is saved unless you keep it.`,
      ['FORECAST_ASSUMPTIONS', 'HYPOTHETICAL_NOT_SAVED'],
    )
    return { ...response, whatIf: { changes: result.appliedChanges } }
  }

  return unavailable('That starter question is not supported.')
}

// Deterministic scenario name for a saved what-if — derived locally from the
// validated ops, never from the model.
export function deriveWhatIfName(changes = []) {
  const compactAmount = value => {
    const abs = Math.abs(value)
    const text = abs >= 1000 && abs % 1000 === 0 ? `${abs / 1000}k` : String(Math.round(abs))
    return `${value < 0 ? '-' : ''}$${text}`
  }
  const parts = changes.map(change => {
    if (change.op === 'add_account') {
      return `+${change.name} ${compactAmount(change.monthlyContribution)}/mo @ ${change.annualGrowthPercent}%`
    }
    if (change.op === 'set_growth') return `${change.accountName} @ ${change.annualGrowthPercent}%`
    if (change.op === 'set_contribution') return `${change.accountName} ${compactAmount(change.monthlyContribution)}/mo`
    if (change.op === 'one_time_change') {
      return `${change.accountName} ${change.amount >= 0 ? '+' : ''}${compactAmount(change.amount)} in ${formatMonthDisplay(change.month)}`
    }
    return ''
  }).filter(Boolean)
  return `What if: ${parts.join(', ')}`.slice(0, 80)
}
