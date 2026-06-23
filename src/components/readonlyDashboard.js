import { netWorthAt, dataHistory, dataTotals } from '../utils'

const noop = () => {}

// Build the exact prop set Dashboard expects from a raw scenario data object,
// with every getter computed from that data and every mutator stubbed out — so
// a card renders the real net-worth view, just frozen and non-interactive.
// Used by the new-scenario push transition (App.jsx) to render the outgoing
// scenario as a frozen card while the new one slides in.
export function readonlyDashboardProps(data) {
  const d = data || { categories: [], snapshots: {}, goal: null }
  return {
    data: d,
    goal: d.goal ?? null,
    getSnapshot: (m) => d.snapshots?.[m] || {},
    getContribution: (m) => d.contributions?.[m] || {},
    getCategoryTotal: (cat, m) => {
      const s = d.snapshots?.[m] || {}
      return cat.accounts.reduce((sum, a) => sum + (s[a.id] || 0), 0)
    },
    getNetWorth: (m) => netWorthAt(d, m),
    getHistory: () => dataHistory(d),
    getPrevMonth: (m) => {
      const ms = Object.keys(d.snapshots || {}).sort()
      const i = ms.indexOf(m)
      return i > 0 ? ms[i - 1] : null
    },
    getTotalAssets: (m) => dataTotals(d, m).assets,
    getTotalLiabilities: (m) => dataTotals(d, m).liabilities,
    setGoal: noop,
    addCategoryWithAccounts: noop,
    updateCategory: noop,
    deleteCategory: noop,
    addAccount: noop,
    deleteAccount: noop,
    renameAccount: noop,
    setAccountGrowth: noop,
    updateContributions: noop,
    clearMonthSnapshot: noop,
    updateCategorySnapshot: noop,
    bulkImport: noop,
  }
}
