import { useMemo } from 'react'
import NetWorthChart from './NetWorthChart'
import {
  formatCurrency, getCurrentMonth, netWorthAt, dataHistory, dataTotals,
} from '../utils'

// A read-only, condensed rendering of one scenario's data — net worth, a mini
// trend chart, the assets/liabilities split and the category list. Shown inside
// the scenario-switching carousel; tapping the card focuses that scenario.
export default function ScenarioPreview({ data }) {
  const { history, month, netWorth, assets, liabilities, categories } = useMemo(() => {
    const history = dataHistory(data)
    const currentMonth = getCurrentMonth()
    // Anchor on the latest month that actually has data, falling back to today.
    const month = history.length ? history[history.length - 1].month : currentMonth
    const { assets, liabilities } = dataTotals(data, month)
    return {
      history,
      month,
      netWorth: netWorthAt(data, month),
      assets,
      liabilities,
      categories: data?.categories || [],
    }
  }, [data])

  const hasLiabilities = categories.some(c => c.type === 'liability')
  const snap = (data?.snapshots || {})[month] || {}
  const catTotal = (cat) => cat.accounts.reduce((s, a) => s + (snap[a.id] || 0), 0)

  return (
    <div className="sp-body">
      <div className="hero" style={{ padding: '20px 20px 0' }}>
        <div className="hero-eyebrow">Net Worth</div>
        <div className="hero-amount" style={{ fontSize: 38 }}>{formatCurrency(netWorth)}</div>
      </div>

      {history.length >= 2 ? (
        <div style={{ padding: '12px 16px 0' }}>
          {/* key forces a fresh draw per scenario so animations don't bleed across cards */}
          <NetWorthChart key={history.length} data={history} height={130} />
        </div>
      ) : (
        <div className="sp-empty-chart">Not enough data to chart yet</div>
      )}

      {categories.length > 0 && (
        <div className="summary-row" style={{ marginTop: 20, marginBottom: 20 }}>
          <div className="card summary-cell assets">
            <div className="summary-cell-label">Assets</div>
            <div className="summary-cell-amount">{formatCurrency(assets)}</div>
          </div>
          {hasLiabilities && (
            <div className="card summary-cell liabilities">
              <div className="summary-cell-label">Liabilities</div>
              <div className="summary-cell-amount">{formatCurrency(liabilities)}</div>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '0 20px' }}>
        <div className="section-title" style={{ marginBottom: 12 }}>Categories</div>
        {categories.length === 0 ? (
          <div className="sp-empty-cats">No categories yet</div>
        ) : (
          <div className="card sp-cat-list">
            {categories.map(cat => (
              <div key={cat.id} className="sp-cat-row">
                <span className="sp-cat-icon" aria-hidden="true">{cat.icon}</span>
                <span className="sp-cat-name">{cat.name}</span>
                <span className="sp-cat-amount">
                  {cat.type === 'liability' ? '−' : ''}{formatCurrency(catTotal(cat))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
