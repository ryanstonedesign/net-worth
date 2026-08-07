import { formatCurrency, getAdjacentMonth, getCurrentMonth } from '../utils'
import {
  MAX_FORECAST_MONTHS,
  buildAccountModels,
  generateForecast,
  monthIndex,
} from './forecast'

export const PORTFOLIO_TARGET = 'portfolio'
export const MAX_TOOL_SERIES_POINTS = 60

const SUPPORTED_STEPS = { monthly: 1, quarterly: 3, annual: 12 }
const ANSWER_STATUSES = new Set(['answered', 'needs_clarification', 'unsupported', 'insufficient_data'])

function activeAccounts(data) {
  return (data?.categories || []).flatMap(category =>
    (category.accounts || []).map(account => ({ account, category })),
  )
}

function recordedMonths(data, currentMonth) {
  return Object.keys(data?.snapshots || {})
    .filter(month => month <= currentMonth && Object.keys(data.snapshots[month] || {}).length > 0)
    .sort()
}

function missingIds(snapshot, ids) {
  return ids.filter(id => snapshot?.[id] == null)
}

function accountNames(dataset, ids) {
  return ids.map(id => dataset.accountById.get(id)?.account.name || id)
}

function formatAccountNames(names) {
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')}, and ${names.length - 3} other account(s)`
}

function cleanSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_')
}

function evidenceId(kind, scenarioId, targetId, metric, month) {
  return [kind, scenarioId, targetId, metric, month].map(cleanSegment).join(':')
}

function targetMeta(dataset, targetId) {
  if (targetId === PORTFOLIO_TARGET) {
    return {
      id: PORTFOLIO_TARGET,
      name: 'Net worth',
      type: 'portfolio',
      accountIds: dataset.accountEntries.map(({ account }) => account.id),
    }
  }

  const category = dataset.categoryById.get(targetId)
  if (category) {
    return {
      id: category.id,
      name: category.name,
      type: 'category',
      categoryType: category.type,
      accountIds: (category.accounts || []).map(account => account.id),
    }
  }

  const entry = dataset.accountById.get(targetId)
  if (entry) {
    return {
      id: entry.account.id,
      name: entry.account.name,
      type: 'account',
      categoryId: entry.category.id,
      categoryName: entry.category.name,
      categoryType: entry.category.type,
      accountIds: [entry.account.id],
    }
  }

  return null
}

function totalForTarget(dataset, target, values) {
  if (target.type === 'account') return values[target.id]

  if (target.type === 'category') {
    return target.accountIds.reduce((total, id) => total + values[id], 0)
  }

  return dataset.data.categories.reduce((portfolioTotal, category) => {
    const categoryTotal = category.accounts.reduce((total, account) => total + values[account.id], 0)
    return portfolioTotal + (category.type === 'liability' ? -categoryTotal : categoryTotal)
  }, 0)
}

function assumptionIds(dataset, target) {
  const ids = target.accountIds || []
  const assumptions = [`origin:${dataset.lastRecordedMonth}`]
  for (const id of ids) {
    const model = dataset.models[id]
    if (!model) continue
    assumptions.push(`growth:${id}:${Math.round(model.annual * 10000) / 100}`)
    if (model.contribution) assumptions.push(`contribution:${id}:${Math.round(model.contribution)}`)
  }
  return assumptions
}

export function getForecastCoverage(data, currentMonth = getCurrentMonth()) {
  const months = recordedMonths(data, currentMonth)
  const entries = activeAccounts(data)
  const allIds = entries.map(({ account }) => account.id)
  const incompleteMonths = months.filter(month => missingIds(data.snapshots?.[month], allIds).length > 0)
  const defaultedGrowthAccountIds = entries
    .filter(({ account }) => account.growth == null || String(account.growth).trim() === '')
    .map(({ account }) => account.id)
  const invalidGrowthAccountIds = entries
    .filter(({ account }) => {
      if (account.growth == null || String(account.growth).trim() === '') return false
      const growth = Number(account.growth)
      return !Number.isFinite(growth) || growth < -100
    })
    .map(({ account }) => account.id)

  return {
    firstRecordedMonth: months[0] || null,
    lastRecordedMonth: months.at(-1) || null,
    recordedMonthCount: months.length,
    incompleteMonths,
    defaultedGrowthAccountIds,
    invalidGrowthAccountIds,
    staleMonths: months.length
      ? Math.max(0, (monthIndex(currentMonth) ?? 0) - (monthIndex(months.at(-1)) ?? 0))
      : null,
  }
}

export function createForecastDataset(data, {
  scenarioId = 'default',
  scenarioName = 'Default Scenario',
  currentMonth = getCurrentMonth(),
  maxMonths = MAX_FORECAST_MONTHS,
} = {}) {
  const safeData = {
    categories: data?.categories || [],
    snapshots: data?.snapshots || {},
    contributions: data?.contributions || {},
    goal: data?.goal ?? null,
  }
  const months = recordedMonths(safeData, currentMonth)
  const coverage = getForecastCoverage(safeData, currentMonth)
  const lastRecordedMonth = coverage.lastRecordedMonth
  const models = buildAccountModels(
    safeData.categories,
    safeData.snapshots,
    safeData.contributions,
    months,
    currentMonth,
  )
  const forecast = lastRecordedMonth
    ? generateForecast(
        safeData.categories,
        models,
        safeData.snapshots,
        safeData.contributions,
        lastRecordedMonth,
        Math.min(maxMonths, MAX_FORECAST_MONTHS),
      )
    : []

  const accountEntries = activeAccounts(safeData)
  return {
    data: safeData,
    scenarioId,
    scenarioName,
    currentMonth,
    recordedMonths: months,
    lastRecordedMonth,
    coverage,
    models,
    forecast,
    forecastByMonth: new Map(forecast.map(row => [row.month, row])),
    categoryById: new Map(safeData.categories.map(category => [category.id, category])),
    accountById: new Map(accountEntries.map(entry => [entry.account.id, entry])),
    accountEntries,
  }
}

export function getValue(dataset, { targetId = PORTFOLIO_TARGET, month }) {
  if (monthIndex(month) == null) return { status: 'error', error: 'Invalid month.' }
  const target = targetMeta(dataset, targetId)
  if (!target) return { status: 'error', error: 'Unknown target.' }
  if (!dataset.lastRecordedMonth) {
    return { status: 'unknown', reason: 'No recorded balances are available yet.' }
  }

  if (month <= dataset.lastRecordedMonth) {
    const snapshot = dataset.data.snapshots[month]
    if (!snapshot) return { status: 'unknown', reason: `No recorded snapshot exists for ${month}.` }
    const missing = missingIds(snapshot, target.accountIds)
    if (missing.length) {
      return {
        status: 'unknown',
        reason: `The ${month} snapshot is incomplete for this target.`,
        quality: { complete: false, missingAccountIds: missing },
      }
    }
    const value = totalForTarget(dataset, target, snapshot)
    return {
      status: 'ok',
      evidence: {
        id: evidenceId('recorded', dataset.scenarioId, target.id, 'balance', month),
        kind: 'recorded',
        metric: target.type === 'portfolio' ? 'netWorth' : 'balance',
        targetId: target.id,
        targetName: target.name,
        scenarioId: dataset.scenarioId,
        scenarioName: dataset.scenarioName,
        month,
        value,
        display: formatCurrency(value),
        assumptions: [],
        quality: { complete: true, warnings: [] },
      },
    }
  }

  const row = dataset.forecastByMonth.get(month)
  if (!row) return { status: 'unknown', reason: `The forecast does not cover ${month}.` }
  if (dataset.coverage.invalidGrowthAccountIds.some(id => target.accountIds.includes(id))) {
    const invalidIds = dataset.coverage.invalidGrowthAccountIds.filter(id => target.accountIds.includes(id))
    return {
      status: 'unknown',
      reason: `Set a valid annual growth rate of -100% or higher for ${formatAccountNames(accountNames(dataset, invalidIds))}.`,
    }
  }

  const values = row.accounts
  const missing = missingIds(values, target.accountIds)
  const value = missing.length ? null : totalForTarget(dataset, target, values)
  if (!Number.isFinite(value)) return { status: 'unknown', reason: 'The forecast produced an invalid value.' }

  const warnings = []
  const defaultedIds = dataset.coverage.defaultedGrowthAccountIds.filter(id => target.accountIds.includes(id))
  if (defaultedIds.length) {
    warnings.push(`0% growth is assumed because no rate is saved for ${formatAccountNames(accountNames(dataset, defaultedIds))}.`)
  }
  if (dataset.coverage.staleMonths > 0) warnings.push(`Forecast starts from data ${dataset.coverage.staleMonths} month(s) old.`)
  if (dataset.coverage.incompleteMonths.length) warnings.push('Some recorded snapshots are incomplete.')

  return {
    status: 'ok',
    evidence: {
      id: evidenceId('forecast', dataset.scenarioId, target.id, 'balance', month),
      kind: 'forecast',
      metric: target.type === 'portfolio' ? 'netWorth' : 'balance',
      targetId: target.id,
      targetName: target.name,
      scenarioId: dataset.scenarioId,
      scenarioName: dataset.scenarioName,
      month,
      value,
      display: formatCurrency(value),
      assumptions: assumptionIds(dataset, target),
      quality: { complete: warnings.length === 0, warnings },
    },
  }
}

export function getSeries(dataset, {
  targetId = PORTFOLIO_TARGET,
  from,
  to,
  step = 'monthly',
}) {
  const start = monthIndex(from)
  const end = monthIndex(to)
  const increment = SUPPORTED_STEPS[step]
  if (start == null || end == null || start > end) return { status: 'error', error: 'Invalid date range.' }
  if (!increment) return { status: 'error', error: 'Unsupported series step.' }

  const requestedPoints = Math.floor((end - start) / increment) + 1
  if (requestedPoints > MAX_TOOL_SERIES_POINTS) {
    return { status: 'error', error: `Series is limited to ${MAX_TOOL_SERIES_POINTS} points.` }
  }

  const evidence = []
  const gaps = []
  for (let offset = 0; offset <= end - start; offset += increment) {
    const month = getAdjacentMonth(from, offset)
    const result = getValue(dataset, { targetId, month })
    if (result.status === 'ok') evidence.push(result.evidence)
    else gaps.push({ month, reason: result.reason || result.error })
  }

  return { status: evidence.length ? 'ok' : 'unknown', evidence, gaps }
}

export function findCrossing(dataset, {
  targetId = PORTFOLIO_TARGET,
  threshold,
  direction = 'above',
}) {
  if (!Number.isFinite(threshold)) return { status: 'error', error: 'Threshold must be a number.' }
  if (!['above', 'below'].includes(direction)) return { status: 'error', error: 'Invalid crossing direction.' }
  if (!dataset.lastRecordedMonth) return { status: 'unknown', reason: 'No recorded balance exists.' }

  const months = [dataset.lastRecordedMonth, ...dataset.forecast.map(row => row.month)]
  let forecastFailure = null
  for (const month of months) {
    const result = getValue(dataset, { targetId, month })
    if (result.status !== 'ok') {
      if (month > dataset.lastRecordedMonth && !forecastFailure) {
        forecastFailure = result.reason || result.error || 'The forecast could not be evaluated.'
      }
      continue
    }
    const crossed = direction === 'above'
      ? result.evidence.value >= threshold
      : result.evidence.value <= threshold
    if (crossed) return result
  }

  if (forecastFailure) return { status: 'unknown', reason: forecastFailure }
  return { status: 'unknown', reason: 'The threshold is not crossed within the supported forecast horizon.' }
}

export function getChange(dataset, { targetId = PORTFOLIO_TARGET, from, to }) {
  if (monthIndex(from) == null || monthIndex(to) == null || from >= to) {
    return { status: 'error', error: 'Invalid comparison window.' }
  }
  const start = getValue(dataset, { targetId, month: from })
  const end = getValue(dataset, { targetId, month: to })
  if (start.status !== 'ok' || end.status !== 'ok') {
    return {
      status: 'unknown',
      reason: start.reason || end.reason || start.error || end.error || 'The comparison is incomplete.',
    }
  }

  const value = end.evidence.value - start.evidence.value
  const target = targetMeta(dataset, targetId)
  return {
    status: 'ok',
    evidence: {
      id: evidenceId('derived', dataset.scenarioId, targetId, 'balanceChange', to),
      kind: 'derived',
      metric: 'balanceChange',
      targetId,
      targetName: target.name,
      scenarioId: dataset.scenarioId,
      scenarioName: dataset.scenarioName,
      month: to,
      fromMonth: from,
      value,
      display: formatCurrency(value),
      assumptions: [],
      quality: {
        complete: start.evidence.quality.complete && end.evidence.quality.complete,
        warnings: [...start.evidence.quality.warnings, ...end.evidence.quality.warnings],
      },
    },
    endpoints: [start.evidence, end.evidence],
  }
}

export function getAssumptions(dataset, targetIds = [PORTFOLIO_TARGET]) {
  const targets = targetIds.map(id => targetMeta(dataset, id))
  if (targets.some(target => !target)) return { status: 'error', error: 'Unknown target.' }

  const accountIds = [...new Set(targets.flatMap(target => target.accountIds))]
  return {
    status: 'ok',
    originMonth: dataset.lastRecordedMonth,
    staleMonths: dataset.coverage.staleMonths,
    accounts: accountIds.map(id => {
      const entry = dataset.accountById.get(id)
      const model = dataset.models[id]
      return {
        id,
        name: entry?.account.name || id,
        growthPercent: model ? Math.round(model.annual * 10000) / 100 : null,
        averageMonthlyContribution: model ? Math.round(model.contribution) : null,
        growthWasDefaulted: dataset.coverage.defaultedGrowthAccountIds.includes(id),
        validForForecast: !dataset.coverage.invalidGrowthAccountIds.includes(id),
      }
    }),
  }
}

export function buildAskManifest({
  data,
  scenarioId,
  scenarioName,
  scenarios = [],
  currentMonth = getCurrentMonth(),
}) {
  const coverage = getForecastCoverage(data, currentMonth)
  return {
    calendarMonth: currentMonth,
    activeScenario: { id: scenarioId, name: scenarioName },
    scenarios: scenarios.map(scenario => ({ id: scenario.id, name: scenario.name })),
    categories: (data?.categories || []).map(category => ({
      id: category.id,
      name: category.name,
      type: category.type,
      accounts: (category.accounts || []).map(account => ({ id: account.id, name: account.name })),
    })),
    coverage: {
      firstRecordedMonth: coverage.firstRecordedMonth,
      lastRecordedMonth: coverage.lastRecordedMonth,
      incompleteMonthCount: coverage.incompleteMonths.length,
      defaultedGrowthAccountCount: coverage.defaultedGrowthAccountIds.length,
      invalidGrowthAccountCount: coverage.invalidGrowthAccountIds.length,
      staleMonths: coverage.staleMonths,
      forecastEnd: coverage.lastRecordedMonth
        ? getAdjacentMonth(coverage.lastRecordedMonth, MAX_FORECAST_MONTHS)
        : null,
    },
    goal: { configured: Number.isFinite(data?.goal) && data.goal > 0 },
    supportedIntents: [
      'net_worth_at_date',
      'goal_timing',
      'goal_status',
      'account_balance_at_date',
      'liability_trajectory',
      'historical_balance_change',
      'largest_historical_mover',
      'category_contribution',
      'scenario_comparison',
      'assumption_summary',
    ],
  }
}

export function compareScenarioValues({ scenarios, month, currentMonth = getCurrentMonth() }) {
  const evidence = []
  const gaps = []
  for (const scenario of scenarios) {
    const dataset = createForecastDataset(scenario.data, {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      currentMonth,
    })
    const result = getValue(dataset, { targetId: PORTFOLIO_TARGET, month })
    if (result.status === 'ok') evidence.push(result.evidence)
    else gaps.push({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      reason: result.reason || result.error,
    })
  }
  return { status: evidence.length ? 'ok' : 'unknown', evidence, gaps }
}

export function getLargestHistoricalMover(dataset, windowMonths = 12) {
  const endMonth = dataset.lastRecordedMonth
  if (!endMonth) return { status: 'unknown', reason: 'No recorded balances are available yet.' }
  const boundary = getAdjacentMonth(endMonth, -windowMonths)
  const startMonth = dataset.recordedMonths.find(month => month >= boundary && month < endMonth)
  if (!startMonth) return { status: 'unknown', reason: 'There is not enough recorded history for this comparison.' }

  const movers = []
  for (const { account } of dataset.accountEntries) {
    const start = getValue(dataset, { targetId: account.id, month: startMonth })
    const end = getValue(dataset, { targetId: account.id, month: endMonth })
    if (start.status !== 'ok' || end.status !== 'ok') continue
    movers.push({ account, start: start.evidence, end: end.evidence, delta: end.evidence.value - start.evidence.value })
  }
  if (!movers.length) return { status: 'unknown', reason: 'The comparison window has incomplete account data.' }

  movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const mover = movers[0]
  const evidence = {
    id: evidenceId('derived', dataset.scenarioId, mover.account.id, 'balanceChange', endMonth),
    kind: 'derived',
    metric: 'balanceChange',
    targetId: mover.account.id,
    targetName: mover.account.name,
    scenarioId: dataset.scenarioId,
    scenarioName: dataset.scenarioName,
    month: endMonth,
    fromMonth: startMonth,
    value: mover.delta,
    display: formatCurrency(mover.delta),
    assumptions: [],
    quality: { complete: true, warnings: [] },
  }
  return { status: 'ok', evidence, endpoints: [mover.start, mover.end] }
}

export function validateStructuredAnswer(answer, evidenceRecords = []) {
  if (!answer || typeof answer !== 'object') return { ok: false, error: 'Answer is not an object.' }
  if (!ANSWER_STATUSES.has(answer.status)) return { ok: false, error: 'Answer status is invalid.' }

  const evidenceMap = new Map(evidenceRecords.map(record => [record.id, record]))
  const ids = Array.isArray(answer.evidenceIds) ? answer.evidenceIds : []
  const facts = Array.isArray(answer.facts) ? answer.facts : []
  const unknownId = [...ids, ...facts.map(fact => fact?.evidenceId)].find(id => !evidenceMap.has(id))
  if (unknownId) return { ok: false, error: 'Answer referenced unknown evidence.' }

  const prose = [answer.intro, answer.explanation].filter(Boolean).join(' ')
  if (/[$€£]\s?\d|\d+(?:\.\d+)?\s?%/.test(prose)) {
    return { ok: false, error: 'Numeric financial claims must be rendered from evidence.' }
  }

  if (answer.status === 'answered' && facts.length === 0 && ids.length === 0) {
    return { ok: false, error: 'Answered responses require evidence.' }
  }

  return { ok: true, evidence: ids.map(id => evidenceMap.get(id)) }
}
