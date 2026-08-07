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
      const base = series.length ? series[series.length - 1] : 0

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
  Object.entries(models || {}).forEach(([id, model]) => { running[id] = model.base })

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
