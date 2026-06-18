import { useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentMonth, getAdjacentMonth } from '../utils'

// "None" holds the user's real data and is never overwritten by a scenario.
// Each prototype scenario lives in its own slot so real data is always safe.
const SCENARIO_KEY = 'networth_scenario'
const SLOT_KEYS = {
  none: 'networth_v1',
  // Demo slots are versioned so refreshed sample data (scenarios, contributions,
  // growth) supersedes any older cached demo without touching real data.
  firsttime: 'networth_proto_firsttime_v2',
  '6month': 'networth_proto_6month_v2',
  '1year': 'networth_proto_1year_v2',
}

export const CATEGORY_COLORS = [
  '#5987A6', '#4E4D8F', '#4F9289', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#F97316',
]

export const CATEGORY_ICONS = ['🏦', '📈', '🎓', '🏠', '🚗', '💰', '💳', '📊', '💎', '🏪']

// ── Prototype scenario datasets ──
// Specs carry the assumptions the forecast cares about: per-account annual
// `growth` (% — positive for appreciation/return, negative for depreciation or
// debt paydown) and, for categories you actively fund, `contributing: true`
// plus a monthly `contrib` ($) per account.
const SCENARIO_FIRST = [
  { name: 'Cash', type: 'asset', icon: '🏦', contributing: true, accounts: [
    { name: 'Checking', base: 3200, growth: 0 },
    { name: 'Savings', base: 8000, growth: 4, contrib: 300 },
  ] },
  { name: 'Investments', type: 'asset', icon: '📈', contributing: true, accounts: [
    { name: 'Brokerage', base: 6000, growth: 7, contrib: 250 },
  ] },
  { name: 'Credit Cards', type: 'liability', icon: '💳', accounts: [
    { name: 'Visa', base: 1800, growth: -20 }, // paying it down
  ] },
] // 3 categories, 4 accounts

const SCENARIO_6M = [
  { name: 'Cash', type: 'asset', icon: '🏦', contributing: true, accounts: [
    { name: 'Checking', base: 5200, growth: 0 },
    { name: 'Savings', base: 16000, growth: 4, contrib: 500 },
  ] },
  { name: 'Investments', type: 'asset', icon: '📈', contributing: true, accounts: [
    { name: 'Brokerage', base: 28000, growth: 7, contrib: 600 },
    { name: '401(k)', base: 47000, growth: 6, contrib: 800 },
  ] },
  { name: 'Real Estate', type: 'asset', icon: '🏠', accounts: [
    { name: 'Home', base: 320000, growth: 3 }, // steady appreciation
  ] },
  { name: 'Credit Cards', type: 'liability', icon: '💳', accounts: [
    { name: 'Visa', base: 4200, growth: -22 }, // paydown
  ] },
] // 4 categories, 6 accounts

const SCENARIO_1Y = [
  { name: 'Cash', type: 'asset', icon: '🏦', contributing: true, accounts: [
    { name: 'Checking', base: 5200, growth: 0 },
    { name: 'Savings', base: 16000, growth: 4, contrib: 500 },
  ] },
  { name: 'Investments', type: 'asset', icon: '📈', contributing: true, accounts: [
    { name: 'Brokerage', base: 28000, growth: 7, contrib: 700 },
    { name: 'Roth IRA', base: 13500, growth: 7, contrib: 540 },
  ] },
  { name: 'Retirement', type: 'asset', icon: '💰', contributing: true, accounts: [
    { name: '401(k)', base: 47000, growth: 6, contrib: 1500 },
  ] },
  { name: 'Real Estate', type: 'asset', icon: '🏠', accounts: [
    { name: 'Home', base: 320000, growth: 3 },
  ] },
  { name: 'Vehicle', type: 'asset', icon: '🚗', accounts: [
    { name: 'Car', base: 24000, growth: -12 }, // depreciating asset
  ] },
  { name: 'Crypto', type: 'asset', icon: '💎', accounts: [
    { name: 'Bitcoin', base: 9000, growth: 15 }, // optimistic, no steady funding
    { name: 'Ethereum', base: 4500, growth: 12 },
  ] },
  { name: 'Business', type: 'asset', icon: '🏪', accounts: [
    { name: 'Business Account', base: 21000, growth: 5 },
  ] },
  { name: 'Credit Cards', type: 'liability', icon: '💳', accounts: [
    { name: 'Visa', base: 4200, growth: -25 },
    { name: 'Amex', base: 2100, growth: -25 },
  ] },
  { name: 'Loans', type: 'liability', icon: '🎓', accounts: [
    { name: 'Student Loan', base: 26000, growth: -12 },
  ] },
] // 9 categories, 13 accounts

function buildFakeData(specs, months) {
  const now = getCurrentMonth()
  const monthList = Array.from({ length: months }, (_, i) =>
    getAdjacentMonth(now, -(months - 1 - i)))
  const snapshots = {}
  const contributions = {}
  monthList.forEach(m => { snapshots[m] = {}; contributions[m] = {} })

  // Shared month-to-month market move so the whole portfolio rises/dips together.
  // Slight upward drift, but ~a third of months come out negative for variety.
  const marketMove = monthList.map((_, mi) =>
    mi === 0 ? 0 : 0.012 + (Math.random() * 2 - 1) * 0.045) // ≈ -3.3% .. +5.7%

  const categories = specs.map((spec, ci) => {
    const isLiab = spec.type === 'liability'
    const accounts = spec.accounts.map((acc, ai) => {
      const accId = `pacc_${ci}_${ai}`
      let val = acc.base
      monthList.forEach((m, mi) => {
        if (mi > 0) {
          if (isLiab) {
            // Trend down (paying off), but occasional upticks (new charges).
            val = Math.max(0, val * (1 - 0.02 + (Math.random() * 2 - 1) * 0.03))
          } else {
            // Shared market move plus a little per-account idiosyncratic noise.
            const idio = (Math.random() * 2 - 1) * 0.02
            val = Math.max(0, val * (1 + marketMove[mi] + idio))
          }
        }
        snapshots[m][accId] = Math.round(val)
        // Record the monthly contribution for funded accounts so the forecast
        // has an average to project forward.
        if (spec.contributing && acc.contrib) contributions[m][accId] = acc.contrib
      })
      return { id: accId, name: acc.name, growth: String(acc.growth ?? 0) }
    })
    return {
      id: `pcat_${ci}`,
      name: spec.name,
      type: spec.type,
      icon: spec.icon,
      color: CATEGORY_COLORS[ci % CATEGORY_COLORS.length],
      contributing: !!spec.contributing,
      accounts,
    }
  })

  // Drop months that ended up with no contributions to keep the map tidy.
  Object.keys(contributions).forEach(m => {
    if (!Object.keys(contributions[m]).length) delete contributions[m]
  })

  const latest = monthList[monthList.length - 1]
  const latestNet = categories.reduce((tot, c) => {
    const s = c.accounts.reduce((sum, a) => sum + (snapshots[latest][a.id] || 0), 0)
    return tot + (c.type === 'liability' ? -s : s)
  }, 0)
  const goal = Math.max(10000, Math.round(latestNet * 1.3 / 10000) * 10000)

  return { categories, snapshots, contributions, goal }
}

// Derive a what-if scenario from the baseline by nudging the forward-looking
// levers — growth rates and contribution amounts — while leaving the shared
// history untouched, so every scenario starts from the same past and diverges
// only in its forecast.
function applyVariant(base, { contribMult = 1, assetGrowthDelta = 0, liabGrowthDelta = 0 }) {
  const data = JSON.parse(JSON.stringify(base))
  data.categories.forEach(cat => {
    const delta = cat.type === 'liability' ? liabGrowthDelta : assetGrowthDelta
    if (delta) cat.accounts.forEach(acc => {
      acc.growth = String(Math.round(((Number(acc.growth) || 0) + delta) * 10) / 10)
    })
  })
  if (contribMult !== 1 && data.contributions) {
    Object.values(data.contributions).forEach(month => {
      Object.keys(month).forEach(id => { month[id] = Math.round(month[id] * contribMult) })
    })
  }
  return data
}

// First entry is always the untouched baseline ("Default Scenario").
const VARIANTS_FIRST = [
  { name: 'Default Scenario' },
  { name: 'Stretch Goal', contribMult: 2 },
]
const VARIANTS_6M = [
  { name: 'Default Scenario' },
  { name: 'Save More', contribMult: 1.6 },
  { name: 'Lean Year', contribMult: 0.5, assetGrowthDelta: -3 },
]
const VARIANTS_1Y = [
  { name: 'Default Scenario' },
  { name: 'Aggressive Saving', contribMult: 1.8 },
  { name: 'Market Downturn', assetGrowthDelta: -9 },
  { name: 'Debt-Free Push', contribMult: 0.7, liabGrowthDelta: -18 },
]

function buildScenarioContainer(specs, months, variants) {
  const base = buildFakeData(specs, months)
  const scenarios = variants.map((v, i) => ({
    id: i === 0 ? 'default' : makeForecastId(),
    name: v.name,
    data: i === 0 ? base : applyVariant(base, v),
  }))
  return { version: 2, activeId: 'default', scenarios }
}

// Returns a full v2 container (multiple forecast scenarios) per demo slot.
function genScenarioData(scenario) {
  if (scenario === '6month') return buildScenarioContainer(SCENARIO_6M, 6, VARIANTS_6M)
  if (scenario === '1year') return buildScenarioContainer(SCENARIO_1Y, 12, VARIANTS_1Y)
  if (scenario === 'firsttime') return buildScenarioContainer(SCENARIO_FIRST, 3, VARIANTS_FIRST)
  return wrapData(emptyData())
}

const emptyData = () => ({ categories: [], snapshots: {}, goal: null })

// ── Forecast scenarios ──
// Distinct from the demo "scenario" above (none/6month/…), forecast scenarios
// are user-created what-if copies of the data living inside a single demo slot.
// Each slot now stores a CONTAINER: { version, activeId, scenarios:[{id,name,data}] }.
// Older saves held a flat { categories, snapshots, goal } object — migrate() wraps
// those into a single "Default Scenario" so nothing is lost.
function makeForecastId() {
  return `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function wrapData(data) {
  return {
    version: 2,
    activeId: 'default',
    scenarios: [{ id: 'default', name: 'Default Scenario', data: data || emptyData() }],
  }
}

function migrate(obj) {
  if (!obj) return null
  if (obj.version === 2 && Array.isArray(obj.scenarios) && obj.scenarios.length) {
    // Guard against a dangling activeId (e.g. a deleted scenario).
    if (!obj.scenarios.some(s => s.id === obj.activeId)) {
      return { ...obj, activeId: obj.scenarios[0].id }
    }
    return obj
  }
  return wrapData(obj) // legacy flat shape
}

function activeOf(container) {
  return container.scenarios.find(s => s.id === container.activeId) || container.scenarios[0]
}

function loadScenario() {
  try {
    const s = localStorage.getItem(SCENARIO_KEY)
    if (s && SLOT_KEYS[s]) return s
  } catch {}
  return 'none'
}

function readSlot(scenario) {
  try {
    const s = localStorage.getItem(SLOT_KEYS[scenario])
    if (s) return JSON.parse(s)
  } catch {}
  return null
}

// Always returns a v2 container for the given demo slot.
function loadInitial(scenario) {
  const stored = migrate(readSlot(scenario))
  if (stored) return stored
  if (scenario === 'none') return wrapData(emptyData())
  return genScenarioData(scenario)
}

export function useData({ initialData = null, onChange = null } = {}) {
  const [scenario, setScenarioState] = useState(loadScenario)
  // `container` holds every forecast scenario for the active demo slot plus the
  // id of the one currently in focus. The flat data API below operates on that
  // active scenario, so the rest of the app is unaware of the wrapper.
  const [container, setContainer] = useState(() => {
    const active = loadScenario()
    if (active !== 'none') return loadInitial(active)
    // Vault mode: the server is the only source of truth. Never let stale
    // localStorage from a previous session leak in here — that's what caused
    // OLD values to get pushed back over NEW after a refresh.
    if (onChange) return migrate(initialData) || wrapData(emptyData())
    return loadInitial('none') // legacy local-only mode
  })

  const data = activeOf(container).data

  // Mutating the active scenario's data — keeps the same (updater | value)
  // contract setData had, so every existing mutator keeps working unchanged.
  const setData = useCallback((updater) => {
    setContainer(c => {
      const act = activeOf(c)
      const next = typeof updater === 'function' ? updater(act.data) : updater
      return { ...c, scenarios: c.scenarios.map(s => s.id === act.id ? { ...s, data: next } : s) }
    })
  }, [])

  // Persist the whole container to the active scenario's own slot — never crosses
  // slots. For "none" this is just an offline cache; the encrypted cloud row is
  // authoritative.
  useEffect(() => {
    try { localStorage.setItem(SLOT_KEYS[scenario], JSON.stringify(container)) } catch {}
  }, [container, scenario])

  // Hold onChange in a ref so its identity changing (which happens on every
  // parent re-render) doesn't re-run the push effect and spuriously push.
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  // Skip pushing on mount and on scenario switches — only push real user edits.
  const skipPushRef = useRef(true)
  const scenarioRef = useRef(scenario)

  // Debounced push of the real ("none") data to the cloud as ciphertext.
  // Deps deliberately exclude onChange — we read it via ref to keep this effect
  // tied only to actual data/scenario changes.
  useEffect(() => {
    if (!onChangeRef.current || scenario !== 'none') {
      skipPushRef.current = true
      return
    }
    if (scenarioRef.current !== scenario) {
      scenarioRef.current = scenario
      skipPushRef.current = true
      return
    }
    if (skipPushRef.current) {
      skipPushRef.current = false
      return
    }
    const t = setTimeout(() => { onChangeRef.current(container) }, 600)
    return () => clearTimeout(t)
  }, [container, scenario])

  const setScenario = useCallback((next) => {
    if (!SLOT_KEYS[next]) return
    setScenarioState(next)
    try { localStorage.setItem(SCENARIO_KEY, next) } catch {}
    // "None" restores the user's real data untouched; fake scenarios regenerate fresh.
    setContainer(next === 'none' ? loadInitial('none') : genScenarioData(next))
  }, [])

  // ── Forecast scenario controls ──
  const forecasts = container.scenarios.map(s => ({ id: s.id, name: s.name }))

  const setActiveForecast = useCallback((id) => {
    setContainer(c => (c.scenarios.some(s => s.id === id) ? { ...c, activeId: id } : c))
  }, [])

  // New scenarios fork the currently-focused one so you can tweak a what-if
  // without disturbing the original. Returns the new id and focuses it.
  const addForecast = useCallback((name) => {
    const id = makeForecastId()
    setContainer(c => {
      const copy = JSON.parse(JSON.stringify(activeOf(c).data))
      return {
        ...c,
        activeId: id,
        scenarios: [...c.scenarios, { id, name: (name || '').trim() || 'New Scenario', data: copy }],
      }
    })
    return id
  }, [])

  const deleteForecast = useCallback((id) => {
    setContainer(c => {
      if (c.scenarios.length <= 1) return c // always keep at least one
      const scenarios = c.scenarios.filter(s => s.id !== id)
      const activeId = c.activeId === id ? scenarios[0].id : c.activeId
      return { ...c, activeId, scenarios }
    })
  }, [])

  const renameForecast = useCallback((id, name) => {
    const clean = (name || '').trim()
    if (!clean) return
    setContainer(c => ({
      ...c,
      scenarios: c.scenarios.map(s => s.id === id ? { ...s, name: clean } : s),
    }))
  }, [])

  // Raw data for any scenario — used to render read-only preview cards.
  const getForecastData = useCallback(
    (id) => container.scenarios.find(s => s.id === id)?.data ?? null,
    [container]
  )

  const addCategoryWithAccounts = useCallback((cat, accounts = []) => {
    const catId = `cat_${Date.now()}`
    const withIds = accounts.map((a, i) => ({ ...a, id: `acc_${Date.now()}_${i}` }))
    setData(d => ({ ...d, categories: [...d.categories, { ...cat, id: catId, accounts: withIds }] }))
    return catId
  }, [])

  const updateCategory = useCallback((id, updates) => {
    setData(d => ({
      ...d,
      categories: d.categories.map(c => c.id === id ? { ...c, ...updates } : c),
    }))
  }, [])

  const deleteCategory = useCallback((id) => {
    setData(d => {
      const cat = d.categories.find(c => c.id === id)
      const accountIds = new Set(cat ? cat.accounts.map(a => a.id) : [])
      const prune = (obj) => Object.fromEntries(
        Object.entries(obj || {}).map(([month, vals]) => [
          month,
          Object.fromEntries(Object.entries(vals).filter(([k]) => !accountIds.has(k))),
        ])
      )
      return {
        ...d,
        categories: d.categories.filter(c => c.id !== id),
        snapshots: prune(d.snapshots),
        contributions: prune(d.contributions),
      }
    })
  }, [])

  const addAccount = useCallback((categoryId, account) => {
    const id = `acc_${Date.now()}`
    setData(d => ({
      ...d,
      categories: d.categories.map(c =>
        c.id === categoryId ? { ...c, accounts: [...c.accounts, { ...account, id }] } : c
      ),
    }))
    return id
  }, [])

  const deleteAccount = useCallback((categoryId, accountId) => {
    const prune = (obj) => Object.fromEntries(
      Object.entries(obj || {}).map(([month, vals]) => [
        month,
        Object.fromEntries(Object.entries(vals).filter(([k]) => k !== accountId)),
      ])
    )
    setData(d => ({
      ...d,
      categories: d.categories.map(c =>
        c.id === categoryId
          ? { ...c, accounts: c.accounts.filter(a => a.id !== accountId) }
          : c
      ),
      snapshots: prune(d.snapshots),
      contributions: prune(d.contributions),
    }))
  }, [])

  const renameAccount = useCallback((categoryId, accountId, newName) => {
    setData(d => ({
      ...d,
      categories: d.categories.map(c =>
        c.id === categoryId
          ? { ...c, accounts: c.accounts.map(a => a.id === accountId ? { ...a, name: newName } : a) }
          : c
      ),
    }))
  }, [])

  // Estimated annual growth (%) used to compound future-month forecasts.
  const setAccountGrowth = useCallback((categoryId, accountId, growth) => {
    setData(d => ({
      ...d,
      categories: d.categories.map(c =>
        c.id === categoryId
          ? { ...c, accounts: c.accounts.map(a => a.id === accountId ? { ...a, growth } : a) }
          : c
      ),
    }))
  }, [])

  // Estimated monthly contribution ($) per account, recorded per month — like
  // balances, each month is independent. Future months use the average.
  const updateContributions = useCallback((month, entries) => {
    setData(d => ({
      ...d,
      contributions: {
        ...(d.contributions || {}),
        [month]: { ...((d.contributions || {})[month] || {}), ...entries },
      },
    }))
  }, [])

  const getContribution = useCallback((month) => data.contributions?.[month] || {}, [data.contributions])

  // Discard a month's manually-entered balances AND contributions so it reverts
  // entirely to its estimate.
  const clearMonthSnapshot = useCallback((month) => {
    setData(d => {
      const snapshots = { ...d.snapshots }
      delete snapshots[month]
      const contributions = { ...(d.contributions || {}) }
      delete contributions[month]
      return { ...d, snapshots, contributions }
    })
  }, [])

  const setGoal = useCallback((amount) => {
    setData(d => ({ ...d, goal: amount }))
  }, [])

  // Bulk import of reviewed rows. Each row:
  //   { categoryName, type, accountName, month, value }
  // Categories and accounts are matched by name (case-insensitive) and reused
  // when they already exist, otherwise created. Snapshot values are written
  // for the row's month. Runs as a single state transaction so one push syncs.
  const bulkImport = useCallback((rows) => {
    setData(d => {
      const categories = d.categories.map(c => ({ ...c, accounts: [...c.accounts] }))
      const snapshots = { ...d.snapshots }
      let seq = 0
      const newId = (prefix) => `${prefix}_${Date.now()}_${seq++}`
      const findCat = (name) =>
        categories.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase())

      for (const row of rows) {
        const name = (row.categoryName || 'Uncategorized').trim()
        const accName = (row.accountName || '').trim()
        if (!accName) continue

        let cat = findCat(name)
        if (!cat) {
          cat = {
            id: newId('cat'),
            name,
            type: row.type === 'liability' ? 'liability' : 'asset',
            icon: row.icon || CATEGORY_ICONS[0],
            color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length],
            accounts: [],
          }
          categories.push(cat)
        }

        let acc = cat.accounts.find(a => a.name.trim().toLowerCase() === accName.toLowerCase())
        if (!acc) {
          acc = { id: newId('acc'), name: accName }
          cat.accounts.push(acc)
        }

        const month = row.month
        if (month && Number.isFinite(row.value)) {
          snapshots[month] = { ...(snapshots[month] || {}), [acc.id]: row.value }
        }
      }

      return { ...d, categories, snapshots }
    })
  }, [])

  const updateCategorySnapshot = useCallback((month, entries) => {
    setData(d => ({
      ...d,
      snapshots: {
        ...d.snapshots,
        [month]: { ...(d.snapshots[month] || {}), ...entries },
      },
    }))
  }, [])

  const getSnapshot = useCallback((month) => data.snapshots[month] || {}, [data.snapshots])

  const getCategoryTotal = useCallback((category, month) => {
    const snap = data.snapshots[month] || {}
    return category.accounts.reduce((sum, acc) => sum + (snap[acc.id] || 0), 0)
  }, [data.snapshots])

  const getNetWorth = useCallback((month) => {
    const snap = data.snapshots[month] || {}
    return data.categories.reduce((total, cat) => {
      const catTotal = cat.accounts.reduce((sum, acc) => sum + (snap[acc.id] || 0), 0)
      return total + (cat.type === 'liability' ? -catTotal : catTotal)
    }, 0)
  }, [data])

  const getHistory = useCallback(() => {
    return Object.keys(data.snapshots)
      .filter(m => Object.keys(data.snapshots[m]).length > 0)
      .sort()
      .map(month => ({ month, netWorth: getNetWorth(month) }))
  }, [data.snapshots, getNetWorth])

  const getPrevMonth = useCallback((month) => {
    const months = Object.keys(data.snapshots).sort()
    const idx = months.indexOf(month)
    return idx > 0 ? months[idx - 1] : null
  }, [data.snapshots])

  const getTotalAssets = useCallback((month) => {
    const snap = data.snapshots[month] || {}
    return data.categories
      .filter(c => c.type !== 'liability')
      .reduce((t, cat) => t + cat.accounts.reduce((s, a) => s + (snap[a.id] || 0), 0), 0)
  }, [data])

  const getTotalLiabilities = useCallback((month) => {
    const snap = data.snapshots[month] || {}
    return data.categories
      .filter(c => c.type === 'liability')
      .reduce((t, cat) => t + cat.accounts.reduce((s, a) => s + (snap[a.id] || 0), 0), 0)
  }, [data])

  return {
    data,
    scenario,
    setScenario,
    // Forecast scenarios
    forecasts,
    activeForecastId: container.activeId,
    setActiveForecast,
    addForecast,
    deleteForecast,
    renameForecast,
    getForecastData,
    goal: data.goal ?? null,
    setGoal,
    addCategoryWithAccounts,
    updateCategory,
    deleteCategory,
    addAccount,
    deleteAccount,
    renameAccount,
    setAccountGrowth,
    updateContributions,
    getContribution,
    clearMonthSnapshot,
    updateCategorySnapshot,
    bulkImport,
    getSnapshot,
    getCategoryTotal,
    getNetWorth,
    getHistory,
    getPrevMonth,
    getTotalAssets,
    getTotalLiabilities,
  }
}
