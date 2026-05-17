import MonthSelector from '../components/MonthSelector'
import CategoryCard from '../components/CategoryCard'
import NetWorthChart from '../components/NetWorthChart'
import { formatCurrency, formatDelta, formatMonthShort } from '../utils'

export default function Dashboard({
  data,
  selectedMonth,
  onMonthChange,
  onNavigate,
  getNetWorth,
  getCategoryTotal,
  getHistory,
  getPrevMonth,
  getTotalAssets,
  getTotalLiabilities,
}) {
  const netWorth = getNetWorth(selectedMonth)
  const prevMonth = getPrevMonth(selectedMonth)
  const prevNW = prevMonth != null ? getNetWorth(prevMonth) : null
  const delta = prevNW != null ? netWorth - prevNW : null
  const history = getHistory()
  const assets = getTotalAssets(selectedMonth)
  const liabilities = getTotalLiabilities(selectedMonth)
  const hasCategories = data.categories.length > 0
  const hasAssets = data.categories.some(c => c.type !== 'liability')
  const hasLiabilities = data.categories.some(c => c.type === 'liability')

  return (
    <div>
      {/* Month selector */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 20px 0' }}>
        <MonthSelector month={selectedMonth} onChange={onMonthChange} />
      </div>

      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">Net Worth</div>
        <div className="hero-amount">{formatCurrency(netWorth)}</div>
        {delta != null ? (
          <div className={`hero-delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'}`}>
            {delta > 0 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            ) : delta < 0 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            ) : null}
            {formatDelta(delta)} vs {formatMonthShort(prevMonth)}
          </div>
        ) : (
          <div className="hero-delta neutral">No previous data</div>
        )}
      </div>

      {!hasCategories ? (
        <EmptyNoCategories onNavigate={onNavigate} />
      ) : (
        <>
          {/* Asset / Liability summary */}
          {(hasAssets || hasLiabilities) && (
            <div className="summary-row">
              {hasAssets && (
                <div className="card summary-cell assets">
                  <div className="summary-cell-label">Assets</div>
                  <div className="summary-cell-amount">{formatCurrency(assets)}</div>
                </div>
              )}
              {hasLiabilities && (
                <div className="card summary-cell liabilities">
                  <div className="summary-cell-label">Liabilities</div>
                  <div className="summary-cell-amount">{formatCurrency(liabilities)}</div>
                </div>
              )}
            </div>
          )}

          {/* Category cards */}
          <div style={{ paddingLeft: 20, marginBottom: 14 }}>
            <span className="section-title">Categories</span>
          </div>
          <div className="cat-scroll">
            {data.categories.map(cat => (
              <CategoryCard
                key={cat.id}
                category={cat}
                total={getCategoryTotal(cat, selectedMonth)}
                netWorth={netWorth}
              />
            ))}
          </div>

          {/* Trend chart */}
          {history.length >= 2 && <NetWorthChart data={history} />}

          {/* Update CTA */}
          <div style={{ padding: '0 20px 8px' }}>
            <button
              className="btn btn-primary btn-full"
              onClick={() => onNavigate('update')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Update This Month
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyNoCategories({ onNavigate }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">💰</div>
      <div className="empty-title">Start tracking</div>
      <div className="empty-desc">
        Add your financial accounts and assets to see your net worth here each month.
      </div>
      <button
        className="btn btn-primary mt16"
        onClick={() => onNavigate('manage')}
      >
        Add Your First Category
      </button>
    </div>
  )
}
