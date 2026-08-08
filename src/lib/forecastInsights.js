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

// Accounts with no value in a month count as 0: genuinely-missing accounts are
// rejected by the completeness gate before totals run, so the only accounts
// that reach here without a value are ones that did not exist yet.
function totalForTarget(dataset, target, values) {
  if (target.type === 'account') return values[target.id]

  if (target.type === 'category') {
    return target.accountIds.reduce((total, id) => total + (values[id] ?? 0), 0)
  }

  return dataset.data.categories.reduce((portfolioTotal, category) => {
    const categoryTotal = category.accounts.reduce((total, account) => total + (values[account.id] ?? 0), 0)
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
  // Accounts that never appear in recorded history (e.g. added by a saved
  // what-if, starting in the future) do not make past months "incomplete".
  const neverRecordedAccountIds = allIds.filter(
    id => !months.some(month => data.snapshots?.[month]?.[id] != null),
  )
  const recordedIds = allIds.filter(id => !neverRecordedAccountIds.includes(id))
  const incompleteMonths = months.filter(month => missingIds(data.snapshots?.[month], recordedIds).length > 0)
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
    neverRecordedAccountIds,
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
    // Never-recorded accounts did not exist in the past: they are excluded
    // from the completeness gate and count as 0 in historical totals.
    const recordedTargetIds = target.accountIds.filter(
      id => !dataset.coverage.neverRecordedAccountIds.includes(id),
    )
    if (!recordedTargetIds.length && target.accountIds.length) {
      return { status: 'unknown', reason: `${target.name} has no recorded history for ${month}.` }
    }
    const missing = missingIds(snapshot, recordedTargetIds)
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
      contributing: !!category.contributing,
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
      'what_if_projection',
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

// ── What-if simulation ──
// A what-if is a bounded list of validated operations applied to a deep copy
// of the active scenario, run through the same deterministic engine, and
// compared against the untouched baseline. The LLM only routes a question into
// this spec; every number below is computed locally.
export const MAX_WHAT_IF_CHANGES = 4
const WHAT_IF_NAME_MAX = 60
const WHAT_IF_BALANCE_MAX = 1_000_000_000
const WHAT_IF_CONTRIBUTION_MAX = 1_000_000

function whatIfError(error) {
  return { ok: false, error }
}

function boundedNumber(value, min, max) {
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max ? number : null
}

export function validateWhatIfChanges(data, changes, currentMonth = getCurrentMonth()) {
  if (!Array.isArray(changes) || changes.length < 1 || changes.length > MAX_WHAT_IF_CHANGES) {
    return whatIfError(`A what-if needs between 1 and ${MAX_WHAT_IF_CHANGES} changes.`)
  }

  const coverage = getForecastCoverage(data, currentMonth)
  if (!coverage.lastRecordedMonth) {
    return whatIfError('Add a recorded balance month before exploring what-ifs.')
  }

  const entries = activeAccounts(data)
  const entryById = new Map(entries.map(entry => [entry.account.id, entry]))
  const categoryById = new Map((data.categories || []).map(category => [category.id, category]))
  const normalized = []

  for (const change of changes) {
    if (!change || typeof change !== 'object') return whatIfError('Each change must be an object.')

    if (change.op === 'add_account') {
      const category = categoryById.get(change.categoryId)
      if (!category) return whatIfError('The new account needs an existing category from the manifest.')
      const name = String(change.name || '').trim().slice(0, WHAT_IF_NAME_MAX)
      if (!name) return whatIfError('The new account needs a name.')
      const startingBalance = boundedNumber(change.startingBalance, 0, WHAT_IF_BALANCE_MAX)
      if (startingBalance == null) return whatIfError('The new account needs a starting balance between $0 and $1B.')
      const growth = boundedNumber(change.annualGrowthPercent, -100, 100)
      if (growth == null) return whatIfError('Annual growth must be between -100% and 100%.')
      const contribution = boundedNumber(change.monthlyContribution, -WHAT_IF_CONTRIBUTION_MAX, WHAT_IF_CONTRIBUTION_MAX)
      if (contribution == null) return whatIfError('Monthly contribution must be between -$1M and $1M.')
      if (contribution !== 0 && !category.contributing) {
        return whatIfError(`${category.name} is not a contributing category, so a monthly contribution there would be ignored.`)
      }
      if (contribution < 0 && category.type !== 'liability') {
        return whatIfError('Negative contributions are only supported on liability accounts (extra payments).')
      }
      normalized.push({ op: 'add_account', categoryId: category.id, categoryName: category.name, name, startingBalance, monthlyContribution: contribution, annualGrowthPercent: growth })
      continue
    }

    const entry = entryById.get(change.accountId)
    if (!entry) return whatIfError('That change references an account that does not exist in this scenario.')

    if (change.op === 'set_growth') {
      const growth = boundedNumber(change.annualGrowthPercent, -100, 100)
      if (growth == null) return whatIfError('Annual growth must be between -100% and 100%.')
      normalized.push({ op: 'set_growth', accountId: entry.account.id, accountName: entry.account.name, annualGrowthPercent: growth })
      continue
    }

    if (change.op === 'set_contribution') {
      if (!entry.category.contributing) {
        return whatIfError(`${entry.category.name} is not a contributing category, so ${entry.account.name} cannot take a monthly contribution.`)
      }
      const contribution = boundedNumber(change.monthlyContribution, -WHAT_IF_CONTRIBUTION_MAX, WHAT_IF_CONTRIBUTION_MAX)
      if (contribution == null) return whatIfError('Monthly contribution must be between -$1M and $1M.')
      if (contribution < 0 && entry.category.type !== 'liability') {
        return whatIfError('Negative contributions are only supported on liability accounts (extra payments).')
      }
      normalized.push({ op: 'set_contribution', accountId: entry.account.id, accountName: entry.account.name, monthlyContribution: contribution })
      continue
    }

    if (change.op === 'one_time_change') {
      if (!entry.category.contributing) {
        return whatIfError(`${entry.category.name} is not a contributing category, so a one-time deposit to ${entry.account.name} would be ignored.`)
      }
      const amount = boundedNumber(change.amount, -WHAT_IF_BALANCE_MAX, WHAT_IF_BALANCE_MAX)
      if (amount == null || amount === 0) return whatIfError('A one-time change needs a non-zero amount within $1B.')
      const offset = monthIndex(change.month) != null
        ? monthIndex(change.month) - monthIndex(coverage.lastRecordedMonth)
        : null
      if (offset == null || offset < 1 || offset > MAX_FORECAST_MONTHS) {
        return whatIfError('A one-time change needs a future month within the forecast horizon.')
      }
      normalized.push({ op: 'one_time_change', accountId: entry.account.id, accountName: entry.account.name, month: change.month, amount })
      continue
    }

    return whatIfError('Unsupported what-if operation.')
  }

  return { ok: true, changes: normalized, lastRecordedMonth: coverage.lastRecordedMonth }
}

// Pure: deep-copies the scenario data and applies the validated ops so the
// engine reproduces the hypothetical. The same function materializes a saved
// scenario (with real minted ids), which is what guarantees simulate-vs-save
// parity. A new account's opening balance is stored as an assumption on the
// account (`startingBalance`), never as a snapshot: a partial snapshot in an
// unrecorded month would make that month count as recorded history and read
// every other account as 0, and clearing it would fan out to synced siblings.
export function applyWhatIfChanges(data, changes, {
  currentMonth = getCurrentMonth(),
  mintAccountId,
} = {}) {
  const validation = validateWhatIfChanges(data, changes, currentMonth)
  if (!validation.ok) return validation

  const copy = JSON.parse(JSON.stringify({
    ...data,
    categories: data.categories || [],
    snapshots: data.snapshots || {},
    contributions: data.contributions || {},
  }))
  const applied = []
  const oneTimeChanges = []

  validation.changes.forEach((change, index) => {
    if (change.op === 'add_account') {
      const id = mintAccountId ? mintAccountId(index) : `whatif_acc_${index}`
      const category = copy.categories.find(candidate => candidate.id === change.categoryId)
      category.accounts.push({
        id,
        name: change.name,
        growth: String(change.annualGrowthPercent),
        monthlyContribution: change.monthlyContribution,
        startingBalance: change.startingBalance,
      })
      applied.push({ ...change, accountId: id })
      return
    }
    if (change.op === 'one_time_change') {
      oneTimeChanges.push(change) // needs final models; applied after the rest
      return
    }
    const entry = copy.categories
      .flatMap(category => category.accounts)
      .find(account => account.id === change.accountId)
    if (change.op === 'set_growth') entry.growth = String(change.annualGrowthPercent)
    if (change.op === 'set_contribution') entry.monthlyContribution = change.monthlyContribution
    applied.push(change)
  })

  if (oneTimeChanges.length) {
    const months = recordedMonths(copy, currentMonth)
    const models = buildAccountModels(copy.categories, copy.snapshots, copy.contributions, months, currentMonth)
    for (const change of oneTimeChanges) {
      // A one-time amount is an extra deposit (or payment) on top of whatever
      // that month would otherwise contribute.
      const base = copy.contributions?.[change.month]?.[change.accountId]
        ?? models[change.accountId]?.contribution
        ?? 0
      copy.contributions[change.month] = {
        ...(copy.contributions[change.month] || {}),
        [change.accountId]: base + change.amount,
      }
      applied.push(change)
    }
  }

  return { ok: true, data: copy, appliedChanges: applied }
}

function asHypothetical(evidence) {
  return {
    ...evidence,
    id: evidenceId('hypothetical', 'what_if', evidence.targetId, evidence.metric, evidence.month),
    kind: 'hypothetical',
  }
}

export function simulateWhatIf(context, {
  changes,
  metric = 'value_at_month',
  month,
  threshold,
} = {}) {
  const applied = applyWhatIfChanges(context.data, changes, { currentMonth: context.currentMonth })
  if (!applied.ok) return { status: 'unknown', reason: applied.error }

  const baseline = context.dataset
  const hypothetical = createForecastDataset(applied.data, {
    scenarioId: 'what_if',
    scenarioName: 'What-if',
    currentMonth: context.currentMonth,
  })

  const evidence = []
  const gaps = []
  let delta = null

  if (metric === 'value_at_month') {
    if (monthIndex(month) == null) return { status: 'error', error: 'Invalid month.' }
    const base = getValue(baseline, { targetId: PORTFOLIO_TARGET, month })
    const hypo = getValue(hypothetical, { targetId: PORTFOLIO_TARGET, month })
    if (base.status === 'ok') evidence.push(base.evidence)
    else gaps.push({ scenarioName: baseline.scenarioName, reason: base.reason || base.error })
    if (hypo.status === 'ok') evidence.push(asHypothetical(hypo.evidence))
    else gaps.push({ scenarioName: 'What-if', reason: hypo.reason || hypo.error })
    if (base.status === 'ok' && hypo.status === 'ok') {
      const value = hypo.evidence.value - base.evidence.value
      delta = {
        id: evidenceId('hypothetical', 'what_if', PORTFOLIO_TARGET, 'whatIfDelta', month),
        kind: 'hypothetical',
        metric: 'whatIfDelta',
        targetId: PORTFOLIO_TARGET,
        targetName: 'Difference',
        scenarioId: 'what_if',
        scenarioName: 'What-if vs baseline',
        month,
        value,
        display: `${value >= 0 ? '+' : ''}${formatCurrency(value)}`,
        assumptions: hypothetical ? assumptionIds(hypothetical, targetMeta(hypothetical, PORTFOLIO_TARGET)) : [],
        quality: {
          complete: base.evidence.quality.complete && hypo.evidence.quality.complete,
          warnings: [...new Set([...base.evidence.quality.warnings, ...hypo.evidence.quality.warnings])],
        },
      }
      evidence.push(delta)
    }
  } else if (metric === 'goal_crossing') {
    const target = Number.isFinite(threshold) && threshold > 0 ? threshold : context.data.goal
    if (!Number.isFinite(target) || target <= 0) {
      return { status: 'unknown', reason: 'Set a net worth goal, or include a target amount in the question.' }
    }
    const base = findCrossing(baseline, { targetId: PORTFOLIO_TARGET, threshold: target, direction: 'above' })
    const hypo = findCrossing(hypothetical, { targetId: PORTFOLIO_TARGET, threshold: target, direction: 'above' })
    if (base.status === 'ok') evidence.push(base.evidence)
    else gaps.push({ scenarioName: baseline.scenarioName, reason: base.reason || base.error })
    if (hypo.status === 'ok') evidence.push(asHypothetical(hypo.evidence))
    else gaps.push({ scenarioName: 'What-if', reason: hypo.reason || hypo.error })
    if (base.status === 'ok' && hypo.status === 'ok') {
      const value = monthIndex(hypo.evidence.month) - monthIndex(base.evidence.month)
      const magnitude = Math.abs(value)
      delta = {
        id: evidenceId('hypothetical', 'what_if', PORTFOLIO_TARGET, 'goalTimingChange', hypo.evidence.month),
        kind: 'hypothetical',
        metric: 'goalTimingChange',
        targetId: PORTFOLIO_TARGET,
        targetName: 'Timing change',
        scenarioId: 'what_if',
        scenarioName: 'What-if vs baseline',
        month: hypo.evidence.month,
        value,
        display: value === 0
          ? 'Same month'
          : `${magnitude} month${magnitude === 1 ? '' : 's'} ${value < 0 ? 'earlier' : 'later'}`,
        assumptions: [],
        quality: { complete: true, warnings: [] },
      }
      evidence.push(delta)
    }
  } else {
    return { status: 'error', error: 'Unsupported what-if metric.' }
  }

  return {
    status: evidence.length ? 'ok' : 'unknown',
    reason: evidence.length ? undefined : gaps.map(gap => gap.reason).filter(Boolean).join(' ') || 'The what-if could not be evaluated.',
    evidence,
    gaps,
    appliedChanges: applied.appliedChanges,
    metric,
  }
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
