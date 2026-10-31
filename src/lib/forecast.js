import { getAdjacentMonth } from '../utils'

export const MAX_FORECAST_MONTHS = 900

export function monthIndex(month) {
  const [year, monthNumber] = String(month || '').split('-').map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return null
  }
  return year * 12 + (monthNumber - 1)
}

// Forecast every month from the last actual month through December of the
// requested year, bounded by the shared application ceiling.
export function customForecastCount(lastMonth, year) {
  const lastIndex = monthIndex(lastMonth)
  const endIndex = monthIndex(`${year}-12`)
  if (lastIndex == null || endIndex == null) return 0
  return Math.max(0, Math.min(endIndex - lastIndex, MAX_FORECAST_MONTHS))
}

// Build the exact account model used by the chart. Missing contribution months
// remain omitted here for behavior parity; the insight layer separately reports
// whether that makes an answer incomplete or assumption-heavy.
export function buildAccountModels(categories, snapshots, contributions, historyMonths, currentMonth) {
  const contributionMonths = Object.keys(contributions || {}).filter(month => month <= currentMonth)
  const models = {}

  for (const category of categories || []) {
    for (const account of category.accounts || []) {
      const series = historyMonths
        .map(month => snapshots?.[month]?.[account.id])
        .filter(value => value != null)
      // Accounts with no recorded history fall back to an explicit opening
      // balance when one is set (what-if accounts), otherwise 0. This is an
      // assumption, never a recorded snapshot — writing a partial snapshot for
      // an unrecorded month would turn it into "history" and read every other
      // account as 0.
      const base = series.length
        ? series[series.length - 1]
        : (Number(account.startingBalance) || 0)

      // An explicit per-account assumption (set by what-if scenarios) wins over
      // the recorded-history average, so accounts without history can still
      // contribute and saved what-ifs reproduce their simulation exactly.
      let contribution = 0
      if (category.contributing) {
        if (account.monthlyContribution != null && Number.isFinite(Number(account.monthlyContribution))) {
          contribution = Number(account.monthlyContribution)
        } else {
          const contributionSeries = contributionMonths
            .map(month => contributions?.[month]?.[account.id])
            .filter(value => value != null)
          if (contributionSeries.length) {
            contribution = contributionSeries.reduce((total, value) => total + value, 0) / contributionSeries.length
          }
        }
      }

      models[account.id] = {
        base,
        contribution,
        annual: (Number(account.growth) || 0) / 100,
        // Set only by what-if accounts that open partway through the
        // forecast; undefined means "already open at the forecast origin".
        startMonth: account.startMonth || null,
      }
    }
  }

  return models
}

// Walk the chart's forecast forward one month at a time. Explicit future
// balances and contributions override the projection for their month.
export function generateForecast(categories, models, overrides, contributionOverrides, lastMonth, count) {
  if (!lastMonth || count < 1) return []

  const running = {}
  Object.entries(models || {}).forEach(([id, model]) => {
    // An account that opens later holds nothing until its start month.
    running[id] = model.startMonth ? 0 : model.base
  })

  const output = []
  for (let offset = 1; offset <= count; offset += 1) {
    const month = getAdjacentMonth(lastMonth, offset)
    const balanceOverrides = overrides?.[month] || {}
    const monthlyContributionOverrides = contributionOverrides?.[month] || {}
    const accounts = {}

    const netWorth = (categories || []).reduce((portfolioTotal, category) => {
      const categoryTotal = (category.accounts || []).reduce((total, account) => {
        const model = models?.[account.id]
        if (!model) return total

        let value
        if (balanceOverrides[account.id] != null) {
          value = balanceOverrides[account.id]
        } else if (model.startMonth && month < model.startMonth) {
          // Not open yet — contributes nothing to the total.
          value = 0
        } else if (model.startMonth && month === model.startMonth) {
          // Opens with its balance; growth and contributions start next month,
          // exactly as they do from a recorded balance.
          value = model.base
        } else {
          const monthlyRate = Math.pow(1 + model.annual, 1 / 12) - 1
          const contribution = category.contributing
            ? (monthlyContributionOverrides[account.id] != null
                ? monthlyContributionOverrides[account.id]
                : model.contribution)
            : 0
          value = Math.max(0, Math.round(running[account.id] * (1 + monthlyRate) + contribution))
        }

        running[account.id] = value
        accounts[account.id] = value
        return total + value
      }, 0)

      return portfolioTotal + (category.type === 'liability' ? -categoryTotal : categoryTotal)
    }, 0)

    output.push({ month, netWorth, accounts, isForecast: true })
  }

  return output
}

// What the model expected each account to read in a recorded month: the
// account's most recent earlier recorded balance, walked forward with the same
// growth and contribution rules the forecast uses. Accounts with no earlier
// recorded balance have nothing to compare against and come back null.
export function estimateRecordedMonth(categories, models, snapshots, contributions, historyMonths, month) {
  const target = monthIndex(month)
  const estimates = {}
  if (target == null) return estimates
  const earlier = (historyMonths || []).filter(m => m < month).sort()

  for (const category of categories || []) {
    for (const account of category.accounts || []) {
      const model = models?.[account.id]
      let prevMonth = null
      for (let i = earlier.length - 1; i >= 0; i -= 1) {
        if (snapshots?.[earlier[i]]?.[account.id] != null) { prevMonth = earlier[i]; break }
      }
      if (!model || prevMonth == null) { estimates[account.id] = null; continue }

      const monthlyRate = Math.pow(1 + model.annual, 1 / 12) - 1
      let value = snapshots[prevMonth][account.id]
      const steps = target - monthIndex(prevMonth)
      for (let step = 1; step <= steps; step += 1) {
        const m = getAdjacentMonth(prevMonth, step)
        const contributionOverride = contributions?.[m]?.[account.id]
        const contribution = category.contributing
          ? (contributionOverride != null ? contributionOverride : model.contribution)
          : 0
        value = Math.max(0, Math.round(value * (1 + monthlyRate) + contribution))
      }
      estimates[account.id] = value
    }
  }

  return estimates
}

// How a recorded balance compares with its estimate. `pct` is signed so that
// positive is always the good direction — above estimate for an asset, below it
// for a liability. `fill` is how much of the bar a missed estimate reaches.
export function estimateProgress(actual, estimate, liability = false) {
  if (actual == null || estimate == null) return { status: 'neutral', pct: null, fill: 0 }
  const diff = liability ? estimate - actual : actual - estimate
  const met = diff >= 0
  const pct = estimate !== 0 ? (diff / Math.abs(estimate)) * 100 : (diff === 0 ? 0 : null)
  let fill = 1
  if (!met) {
    const ratio = liability ? (actual > 0 ? estimate / actual : 0) : (estimate > 0 ? actual / estimate : 0)
    fill = Math.min(1, Math.max(0, ratio))
  }
  return { status: met ? 'up' : 'down', pct, fill }
}
