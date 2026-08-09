import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '../utils'

// A changing digit moves only a fraction of its height while crossfading. The
// first render is intentionally static: net worth should read as recorded data,
// not an artificial counter winding up from zero.
function Digit({ value }) {
  const [visible, setVisible] = useState(value)
  const [outgoing, setOutgoing] = useState(null)
  const [transitionId, setTransitionId] = useState(0)
  const prev = useRef(value)
  const clearRef = useRef(null)

  useEffect(() => {
    if (prev.current === value) return undefined
    const oldValue = prev.current
    prev.current = value
    setOutgoing(oldValue)
    setVisible(value)
    setTransitionId(id => id + 1)
    clearTimeout(clearRef.current)
    clearRef.current = setTimeout(() => setOutgoing(null), 500)
    return () => clearTimeout(clearRef.current)
  }, [value])

  return (
    <span className="roll-digit" aria-hidden="true">
      <span key={`in-${transitionId}`} className={transitionId ? 'roll-digit-in' : 'roll-digit-static'}>{visible}</span>
      {outgoing != null && (
        <span key={`out-${transitionId}`} className="roll-digit-out">{outgoing}</span>
      )}
    </span>
  )
}

export default function RollingNumber({ value }) {
  const str = formatCurrency(Math.round(value || 0))
  return (
    <span className="roll-num">
      <span className="sr-only">{str}</span>
      {str.split('').map((c, i) => {
        if (c >= '0' && c <= '9') {
          return <Digit key={i} value={Number(c)} />
        }
        return <span key={i} className="roll-sep" aria-hidden="true">{c}</span>
      })}
    </span>
  )
}
