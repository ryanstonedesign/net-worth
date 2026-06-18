import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '../utils'

const CELL = 1.35 // em — height of one digit cell and of the masked window

// One digit position rendered as a vertical reel of 0-9 (twice, so it can spin
// a full loop). It rolls THROUGH the intermediate digits to reach its target.
// It does NOT animate on mount — the number simply appears in place — so that
// mounting a fresh view (e.g. entering/exiting the scenario switcher) never
// triggers a roll. Only an in-place value change (month scroll, an edit) rolls.
function Digit({ value }) {
  const [k, setK] = useState(value)          // reel index currently shown
  const [anim, setAnim] = useState(false)    // transition enabled?
  const prev = useRef(value)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    prev.current = value
  }, [])

  // Value change — roll from the old digit to the new one through the middle.
  useEffect(() => {
    if (!mounted.current || prev.current === value) return
    prev.current = value
    setAnim(true)
    setK(10 + value)
  }, [value])

  return (
    <span className="roll-digit" aria-hidden="true">
      <span
        className={`reel${anim ? '' : ' no-anim'}`}
        style={{ transform: `translateY(${-(k * CELL)}em)` }}
      >
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className="reel-cell">{i % 10}</span>
        ))}
      </span>
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
