import { useState, useEffect } from 'react'
import { formatCurrency } from '../utils'

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

// Odometer-style currency value: each digit is a vertical 0-9 reel that slides
// to its target. Re-plays from zero on mount and whenever `replayKey` changes;
// rolls digit-to-digit when only `value` changes.
export default function RollingNumber({ value, replayKey }) {
  const [phase, setPhase] = useState('reset')

  useEffect(() => {
    setPhase('reset') // snap reels to zero with no transition
    let r2
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setPhase('run')) // then roll up to target
    })
    return () => { cancelAnimationFrame(r1); if (r2) cancelAnimationFrame(r2) }
  }, [replayKey])

  const running = phase === 'run'
  const str = formatCurrency(Math.round(value || 0))
  let digitIdx = 0

  return (
    <span className="roll-num">
      <span className="sr-only">{str}</span>
      {str.split('').map((ch, i) => {
        if (ch >= '0' && ch <= '9') {
          const d = Number(ch)
          const delay = digitIdx * 0.035
          digitIdx++
          return (
            <span key={i} className="roll-digit" aria-hidden="true">
              <span
                className={`roll-col${running ? '' : ' no-anim'}`}
                style={{
                  transform: `translateY(${-(running ? d : 0) * 10}%)`,
                  filter: running ? 'blur(0px)' : 'blur(8px)',
                  opacity: running ? 1 : 0,
                  transitionDelay: `${delay}s`,
                }}
              >
                {DIGITS.map(n => (
                  <span key={n} className="roll-cell">{n}</span>
                ))}
              </span>
            </span>
          )
        }
        return <span key={i} className="roll-sep" aria-hidden="true">{ch}</span>
      })}
    </span>
  )
}
