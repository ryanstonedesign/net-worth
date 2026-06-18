import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '../utils'

const CELL = 1.35 // em — height of one digit cell and of the masked window

// The entrance roll should play once, on the app's first paint of the hero —
// not every time a fresh view mounts. Entering/exiting the scenario switcher
// mounts new Dashboards, and we don't want the number to roll on those. This
// module-level latch flips after the first RollingNumber mounts so only that
// initial instance animates its entrance; every later mount appears in place.
let firstMountDone = false

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

export default function RollingNumber({ value }) {
  // Capture once, at this instance's first render: the very first RollingNumber
  // in the session animates its entrance, later ones (switcher mounts) don't.
  const entranceRef = useRef(null)
  if (entranceRef.current === null) entranceRef.current = !firstMountDone
  useEffect(() => { firstMountDone = true }, [])

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
