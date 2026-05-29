import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '../utils'

const OUT_MS = 260
const IN_MS = 320

// Currency value where each digit fades out to zero opacity and back in (with a
// soft blur) only when that digit actually changes. Digits that stay the same
// don't animate. Single-line glyphs — nothing is cropped and nothing extends
// above/below the line to overlap surrounding text.
export default function RollingNumber({ value }) {
  const target = formatCurrency(Math.round(value || 0))
  const [display, setDisplay] = useState(target)
  const [changed, setChanged] = useState(null) // Set of animating indices, or null
  const [phase, setPhase] = useState('enter')   // 'enter' | 'out' | 'in' | 'idle'
  const prevTarget = useRef(target)
  const timers = useRef([])

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  // Entrance — fade the whole number in from zero opacity on mount.
  useEffect(() => {
    setChanged(new Set(target.split('').map((_, i) => i)))
    setPhase('enter')
    const raf = requestAnimationFrame(() => setPhase('in'))
    const t = setTimeout(() => { setChanged(null); setPhase('idle') }, IN_MS + 60)
    timers.current = [t]
    return () => { cancelAnimationFrame(raf); clearTimers() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Value change — fade out only the characters that differ, swap, fade back in.
  useEffect(() => {
    if (target === prevTarget.current) return
    const oldStr = prevTarget.current
    prevTarget.current = target

    const diff = new Set()
    if (oldStr.length === target.length) {
      for (let i = 0; i < target.length; i++) if (oldStr[i] !== target[i]) diff.add(i)
    } else {
      for (let i = 0; i < target.length; i++) diff.add(i)
    }
    if (diff.size === 0) { setDisplay(target); return }

    clearTimers()
    setDisplay(oldStr)
    setChanged(diff)
    setPhase('out')
    const t1 = setTimeout(() => { setDisplay(target); setPhase('in') }, OUT_MS)
    const t2 = setTimeout(() => { setChanged(null); setPhase('idle') }, OUT_MS + IN_MS + 40)
    timers.current = [t1, t2]
    return clearTimers
  }, [target])

  return (
    <span className="roll-num">
      <span className="sr-only">{target}</span>
      {display.split('').map((ch, i) => {
        const animating = changed != null && changed.has(i)
        const hidden = animating && (phase === 'enter' || phase === 'out')
        const isSep = ch < '0' || ch > '9'
        return (
          <span
            key={i}
            aria-hidden="true"
            className={`roll-glyph${isSep ? ' roll-sep' : ''}${phase === 'enter' ? ' no-anim' : ''}`}
            style={{ opacity: hidden ? 0 : 1, filter: hidden ? 'blur(6px)' : 'blur(0px)' }}
          >
            {ch}
          </span>
        )
      })}
    </span>
  )
}
