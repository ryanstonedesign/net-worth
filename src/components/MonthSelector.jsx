import { useRef, useEffect } from 'react'
import { formatMonthDisplay, getAdjacentMonth } from '../utils'

export default function MonthSelector({ month, onChange }) {
  // Long-press to fast-scroll through months. We track the stepping month in a
  // ref so each tick advances from the last committed value (not a stale prop),
  // and accelerate the repeat the longer the button is held. There's no upper
  // or lower bound — the graph expands to include whatever month is in view.
  const holdRef = useRef(null)
  const stepMonthRef = useRef(month)

  const clearHold = () => {
    if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null }
  }
  useEffect(() => clearHold, [])

  const step = (delta) => {
    const next = getAdjacentMonth(stepMonthRef.current, delta)
    stepMonthRef.current = next
    onChange(next)
  }

  const startHold = (delta) => {
    clearHold()
    stepMonthRef.current = month
    step(delta) // immediate first step (also handles a plain tap)
    let speed = 240
    const tick = () => {
      step(delta)
      speed = Math.max(55, speed - 18) // accelerate
      holdRef.current = setTimeout(tick, speed)
    }
    holdRef.current = setTimeout(tick, 380) // delay before fast-repeat kicks in
  }

  return (
    <div className="month-selector">
      <button
        className="month-nav-btn"
        onPointerDown={e => { e.preventDefault(); startHold(-1) }}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        aria-label="Previous month"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      <span className="month-selector-label">{formatMonthDisplay(month)}</span>

      <button
        className="month-nav-btn"
        onPointerDown={e => { e.preventDefault(); startHold(1) }}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        aria-label="Next month"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  )
}
