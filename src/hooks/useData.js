import { useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentMonth, getAdjacentMonth } from '../utils'

// "None" holds the user's real data and is never overwritten by a scenario.
// Each prototype scenario lives in its own slot so real data is always safe.
const SCENARIO_KEY = 'networth_scenario'
const SLOT_KEYS = {
  none: 'networth_v1',
  firsttime: 'networth_proto_firsttime',
  '6month': 'networth_proto_6month',
  '1year': 'networth_proto_1year',
}

export const CATEGORY_COLORS = [
  '#5987A6', '#4E4D8F', '#4F9289', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#F97316',
]

export const CATEGORY_ICONS = ['🏦', '📈', '🎓', '🏠', '🚗', '💰', '💳', '📊', '💎', '🏪']

// ── Prototype scenario datasets ──
const SCENARIO_6M = [
  { name: 'Cash', type: 'asset', icon: '🏦', accounts: [
    { name: 'Checking', base: 5200 },
    { name: 'Savings', base: 16000 },
  ] },
  { name: 'Investments', type: 'asset', icon: '📈', accounts: [
    { name: 'Brokerage', base: 28000 },
    { name: '401(k)', base: 47000 },
  ] },
  { name: 'Real Estate', type: 'asset', icon: '🏠', accounts: [
    { name: 'Home', base: 320000 },
  ] },
  { name: 'Credit Cards', type: 'liability', icon: '💳', accounts: [
    { name: 'Visa', base: 4200 },
  ] },
] // 4 categories, 6 accounts

const SCENARIO_1Y = [
  { name: 'Cash', type: 'asset', icon: '🏦', accounts: [
    { name: 'Checking', base: 5200 },
    { name: 'Savings', base: 16000 },
  ] },
  { name: 'Investments', type: 'asset', icon: '📈', accounts: [
    { name: 'Brokerage', base: 28000 },
    { name: 'Roth IRA', base: 13500 },
  ] },
  { name: 'Retirement', type: 'asset', icon: '💰', accounts: [
    { name: '401(k)', base: 47000 },
  ] },
  { name: 'Real Estate', type: 'asset', icon: '🏠', accounts: [
    { name: 'Home', base: 320000 },
  ] },
  { name: 'Crypto', type: 'asset', icon: '💎', accounts: [
    { name: 'Bitcoin', base: 9000 },
    { name: 'Ethereum', base: 4500 },
  ] },
  { name: 'Business', type: 'asset', icon: '🏪', accounts: [
    { name: 'Business Account', base: 21000 },
  ] },
  { name: 'Credit Cards', type: 'liability', icon: '💳', accounts: [
    { name: 'Visa', base: 4200 },
    { name: 'Amex', base: 2100 },
  ] },
  { name: 'Loans', type: 'liability', icon: '🎓', accounts: [
    { name: 'Student Loan', base: 26000 },
  ] },
] // 8 categories, 12 accounts

function buildFakeData(specs, months) {
  const now = getCurrentMonth()
  const monthList = Array.from({ length: months }, (_, i) =>
    getAdjacentMonth(now, -(months - 1 - i)))
  const snapshots = {}
  monthList.forEach(m => { snapshots[m] = {} })

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
      })
      return { id: accId, name: acc.name }
    })
    return {
      id: `pcat_${ci}`,
      name: spec.name,
      type: spec.type,
      icon: spec.icon,
      color: CATEGORY_COLORS[ci % CATEGORY_COLORS.length],
      accounts,
    }
  })

  const latest = monthList[monthList.length - 1]
  const latestNet = categories.reduce((tot, c) => {
    const s = c.accounts.reduce((sum, a) => sum + (snapshots[latest][a.id] || 0), 0)
    return tot + (c.type === 'liability' ? -s : s)
  }, 0)
  const goal = Math.max(10000, Math.round(latestNet * 1.3 / 10000) * 10000)

  return { categories, snapshots, goal }
}

function genScenarioData(scenario) {
  if (scenario === '6month') return buildFakeData(SCENARIO_6M, 6)
  if (scenario === '1year') return buildFakeData(SCENARIO_1Y, 12)
  return { categories: [], snapshots: {}, goal: null } // firsttime
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

function loadInitial(scenario) {
  const stored = readSlot(scenario)
  if (stored) return stored
  if (scenario === 'none') return { categories: [], snapshots: {}, goal: null }
  return genScenarioData(scenario)
}

export function useData({ initialData = null, onChange = null } = {}) {
  const [scenario, setScenarioState] = useState(loadScenario)
  const [data, setData] = useState(() => {
    const active = loadScenario()
    if (active !== 'none') return loadInitial(active)
    // Vault mode: the server is the only source of truth. Never let stale
    // localStorage from a previous session leak in here — that's what caused
    // OLD values to get pushed back over NEW after a refresh.
    if (onChange) return initialData || { categories: [], snapshots: {}, goal: null }
    return loadInitial('none') // legacy local-only mode
  })

  // Persist edits to the active scenario's own slot — never crosses slots.
  // For "none" this is just an offline cache; the encrypted cloud row is authoritative.
  useEffect(() => {
    try { localStorage.setItem(SLOT_KEYS[scenario], JSON.stringify(data)) } catch {}
  }, [data, scenario])

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
    const t = setTimeout(() => { onChangeRef.current(data) }, 600)
    return () => clearTimeout(t)
  }, [data, scenario])

  const setScenario = useCallback((next) => {
    if (!SLOT_KEYS[next]) return
    setScenarioState(next)
    try { localStorage.setItem(SCENARIO_KEY, next) } catch {}
    // "None" restores the user's real data untouched; fake scenarios regenerate fresh.
    setData(next === 'none' ? loadInitial('none') : genScenarioData(next))
  }, [])

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
      const snapshots = Object.fromEntries(
        Object.entries(d.snapshots).map(([month, vals]) => [
          month,
          Object.fromEntries(Object.entries(vals).filter(([k]) => !accountIds.has(k))),
        ])
      )
      return { ...d, categories: d.categories.filter(c => c.id !== id), snapshots }
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
    setData(d => ({
      ...d,
      categories: d.categories.map(c =>
        c.id === categoryId
          ? { ...c, accounts: c.accounts.filter(a => a.id !== accountId) }
          : c
      ),
      snapshots: Object.fromEntries(
        Object.entries(d.snapshots).map(([month, vals]) => [
          month,
          Object.fromEntries(Object.entries(vals).filter(([k]) => k !== accountId)),
        ])
      ),
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
    goal: data.goal ?? null,
    setGoal,
    addCategoryWithAccounts,
    updateCategory,
    deleteCategory,
    addAccount,
    deleteAccount,
    renameAccount,
    setAccountGrowth,
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
