import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '../utils'

const CELL = 1.35 // em — height of one digit cell and of the masked window

// One digit position rendered as a vertical reel of 0-9 (twice, so it can spin
// a full loop). It rolls THROUGH the intermediate digits to reach its target.
// On the entrance (page load only) it spins a full loop into place; on an
// in-place value change it rolls from the old digit to the new one. A digit
// whose value doesn't change never moves.
function Digit({ value, animateEntrance, enterDelay }) {
  const [k, setK] = useState(value)          // reel index currently shown
  const [anim, setAnim] = useState(false)    // transition enabled?
  const [delay, setDelay] = useState(enterDelay)
  const prev = useRef(value)
  const mounted = useRef(false)

  // Entrance — only on the app's first hero; otherwise appear in place.
  useEffect(() => {
    mounted.current = true
    prev.current = value
    if (!animateEntrance) return
    const r = requestAnimationFrame(() => { setAnim(true); setK(10 + value) })
    return () => cancelAnimationFrame(r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Value change — roll from the old digit to the new one through the middle.
  useEffect(() => {
    if (!mounted.current || prev.current === value) return
    prev.current = value
    setDelay(0)
    setAnim(true)
    setK(10 + value)
  }, [value])

  return (
    <span className="roll-digit" aria-hidden="true">
      <span
        className={`reel${anim ? '' : ' no-anim'}`}
        style={{ transform: `translateY(${-(k * CELL)}em)`, transitionDelay: `${delay}s` }}
      >
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className="reel-cell">{i % 10}</span>
        ))}
      </span>
    </span>
  )
}

export default function RollingNumber({ value, animateEntrance = true }) {
  // Roll the entrance on mount when asked (page load + scenario switches both
  // remount the hero). Captured once so a later value change doesn't replay it.
  const entranceRef = useRef(animateEntrance)

  const str = formatCurrency(Math.round(value || 0))
  let digitIdx = 0
  return (
    <span className="roll-num">
      <span className="sr-only">{str}</span>
      {str.split('').map((c, i) => {
        if (c >= '0' && c <= '9') {
          const delay = digitIdx * 0.05
          digitIdx++
          return <Digit key={i} value={Number(c)} animateEntrance={entranceRef.current} enterDelay={delay} />
        }
        return <span key={i} className="roll-sep" aria-hidden="true">{c}</span>
      })}
    </span>
  )
}
