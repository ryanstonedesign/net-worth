import { formatMonthDisplay, getAdjacentMonth, getCurrentMonth } from '../utils'

export default function MonthSelector({ month, onChange }) {
  const current = getCurrentMonth()
  const isMax = month >= current

  return (
    <div className="month-selector">
      <button
        className="month-nav-btn"
        onClick={() => onChange(getAdjacentMonth(month, -1))}
        aria-label="Previous month"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      <span className="month-selector-label">{formatMonthDisplay(month)}</span>

      <button
        className="month-nav-btn"
        onClick={() => onChange(getAdjacentMonth(month, 1))}
        disabled={isMax}
        aria-label="Next month"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  )
}
