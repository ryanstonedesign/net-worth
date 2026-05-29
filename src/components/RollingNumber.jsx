import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '../utils'

// A single digit position. When its value changes, the old glyph rolls out
// (sliding + fading + blurring to zero opacity) while the new glyph rolls in
// from the opposite side. Nothing is cropped — the glyphs reach zero opacity
// before they travel far enough to overlap the text above or below. A digit
// whose value doesn't change never animates.
function Digit({ ch, dir, enterDelay }) {
  const [stack, setStack] = useState([{ key: 'e', ch, mode: 'enter' }])
  const prevCh = useRef(ch)
  const seq = useRef(0)
  const timer = useRef(null)

  useEffect(() => {
    if (prevCh.current === ch) return
    prevCh.current = ch
    seq.current += 1
    const key = 's' + seq.current
    setStack(prev => [
      ...prev.filter(l => l.mode !== 'leave').map(l => ({ ...l, mode: 'leave' })),
      { key, ch, mode: 'in' },
    ])
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStack([{ key, ch, mode: 'idle' }]), 650)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [ch])

  const down = dir < 0 ? ' down' : ''
  return (
    <span className="roll-digit" aria-hidden="true">
      {stack.map(l => (
        <span
          key={l.key}
          className={`roll-glyph rg-${l.mode}${l.mode === 'enter' ? '' : down}`}
          style={l.mode === 'enter' && enterDelay ? { animationDelay: `${enterDelay}s` } : undefined}
        >
          {l.ch}
        </span>
      ))}
    </span>
  )
}

export default function RollingNumber({ value }) {
  const str = formatCurrency(Math.round(value || 0))
  const prevVal = useRef(value)
  const dir = (value || 0) >= (prevVal.current || 0) ? 1 : -1
  useEffect(() => { prevVal.current = value }, [value])

  let digitIdx = 0
  return (
    <span className="roll-num">
      <span className="sr-only">{str}</span>
      {str.split('').map((c, i) => {
        if (c >= '0' && c <= '9') {
          const delay = digitIdx * 0.04
          digitIdx++
          return <Digit key={i} ch={c} dir={dir} enterDelay={delay} />
        }
        return <span key={i} className="roll-sep" aria-hidden="true">{c}</span>
      })}
    </span>
  )
}
