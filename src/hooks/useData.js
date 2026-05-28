import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'networth_v1'

export const CATEGORY_COLORS = [
  '#5987A6', '#4E4D8F', '#4F9289', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#F97316',
]

export const CATEGORY_ICONS = ['🏦', '📈', '🎓', '🏠', '🚗', '💰', '💳', '📊', '💎', '🏪']

function loadData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  return { categories: [], snapshots: {}, goal: null }
}

export function useData() {
  const [data, setData] = useState(loadData)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
  }, [data])

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

  const setGoal = useCallback((amount) => {
    setData(d => ({ ...d, goal: amount }))
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
    goal: data.goal ?? null,
    setGoal,
    addCategoryWithAccounts,
    updateCategory,
    deleteCategory,
    addAccount,
    deleteAccount,
    renameAccount,
    updateCategorySnapshot,
    getSnapshot,
    getCategoryTotal,
    getNetWorth,
    getHistory,
    getPrevMonth,
    getTotalAssets,
    getTotalLiabilities,
  }
}
