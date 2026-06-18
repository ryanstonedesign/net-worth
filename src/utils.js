const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getAdjacentMonth(month, delta) {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, m - 1 + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthDisplay(month) {
  const [year, m] = month.split('-')
  return `${MONTH_NAMES[parseInt(m) - 1]} ${year}`
}

export function formatMonthShort(month) {
  const [year, m] = month.split('-')
  return `${MONTH_SHORT[parseInt(m) - 1]} '${year.slice(2)}`
}

export function formatCurrency(value, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCompact(value) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return formatCurrency(value)
}

export function formatDelta(value) {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatCurrency(value)}`
}

export function parseAmount(str) {
  const num = parseFloat(String(str).replace(/[$,]/g, ''))
  return isNaN(num) ? 0 : num
}

// ── Pure net-worth helpers (operate on a raw data object, not the hook) ──
// Used to render read-only scenario preview cards without wiring up the full
// forecasting engine.
export function netWorthAt(data, month) {
  const snap = (data?.snapshots || {})[month] || {}
  return (data?.categories || []).reduce((tot, cat) => {
    const sum = cat.accounts.reduce((s, a) => s + (snap[a.id] || 0), 0)
    return tot + (cat.type === 'liability' ? -sum : sum)
  }, 0)
}

export function dataHistory(data) {
  const snaps = data?.snapshots || {}
  return Object.keys(snaps)
    .filter(m => Object.keys(snaps[m]).length > 0)
    .sort()
    .map(month => ({ month, netWorth: netWorthAt(data, month) }))
}

// Totals at a month, split by category type.
export function dataTotals(data, month) {
  const snap = (data?.snapshots || {})[month] || {}
  let assets = 0, liabilities = 0
  for (const cat of data?.categories || []) {
    const sum = cat.accounts.reduce((s, a) => s + (snap[a.id] || 0), 0)
    if (cat.type === 'liability') liabilities += sum
    else assets += sum
  }
  return { assets, liabilities }
}
