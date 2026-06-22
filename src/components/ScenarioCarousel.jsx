import { useRef, useEffect, useState, useCallback } from 'react'
import Dashboard from '../pages/Dashboard'
import { getCurrentMonth, netWorthAt, dataHistory, dataTotals } from '../utils'

const noop = () => {}

// Build the exact prop set Dashboard expects from a raw scenario data object,
// with every getter computed from that data and every mutator stubbed out — so
// a card renders the real net-worth view, just frozen and non-interactive.
// Exported so the push-in transition (App.jsx) can render the outgoing scenario
// as a frozen card while the new one slides in.
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

// Horizontal, scroll-snapping rail of scenario cards. Each card is the real
// net-worth view shrunk into a card; one sits in the middle taking most of the
// width while its neighbours peek from the edges. The centred card is reported
// upward (for the bar's name + delete target); tapping any card focuses it.
export default function ScenarioCarousel({
  scenarios, centerId, selectedMonth, getForecastData, onCenterChange, onFocus,
}) {
  const railRef = useRef(null)
  const startIndex = Math.max(0, scenarios.findIndex(s => s.id === centerId))
  const [center, setCenter] = useState(startIndex)

  // Distance between consecutive card starts (card width + gap).
  const stride = () => {
    const rail = railRef.current
    if (!rail || rail.children.length < 2) return rail?.clientWidth || 1
    return rail.children[1].offsetLeft - rail.children[0].offsetLeft
  }

  const recomputeCenter = useCallback(() => {
    const rail = railRef.current
    if (!rail) return
    const idx = Math.round(rail.scrollLeft / stride())
    const clamped = Math.max(0, Math.min(scenarios.length - 1, idx))
    setCenter(prev => (prev === clamped ? prev : clamped))
  }, [scenarios.length])

  // Jump to the requested scenario when the carousel first opens.
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    requestAnimationFrame(() => {
      rail.scrollLeft = startIndex * stride()
      setCenter(startIndex)
    })
    // Only on mount — re-centering on every prop change would fight user scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = scenarios[center]?.id
    if (id) onCenterChange?.(id)
  }, [center, scenarios, onCenterChange])

  const scrollTo = (i) => {
    railRef.current?.scrollTo({ left: i * stride(), behavior: 'smooth' })
  }

  // Show every card at the month that was selected before opening the switcher,
  // so net-worth totals line up for comparison across scenarios.
  const month = selectedMonth || getCurrentMonth()

  return (
    <div className="scenario-rail" ref={railRef} onScroll={recomputeCenter}>
      {scenarios.map((s, i) => (
        <div
          key={s.id}
          className={`scenario-card${i === center ? ' is-center' : ''}`}
          onClick={() => {
            // Tapping a peeking card centres it first; tapping the centred one focuses.
            if (i === center) onFocus?.(s.id)
            else scrollTo(i)
          }}
        >
          <div className="scenario-card-inner card">
            <Dashboard
              {...readonlyDashboardProps(getForecastData(s.id))}
              selectedMonth={month}
              onMonthChange={noop}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
