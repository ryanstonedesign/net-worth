import { useRef, useEffect, useState, useCallback } from 'react'
import ScenarioPreview from './ScenarioPreview'

// Horizontal, scroll-snapping rail of scenario preview cards. One card sits in
// the middle taking most of the width while its neighbours peek from the edges.
// The centred card is reported upward (for the bar's name + delete target) and
// tapping any card brings it into focus.
export default function ScenarioCarousel({
  scenarios, centerId, getForecastData, onCenterChange, onFocus,
}) {
  const railRef = useRef(null)
  const startIndex = Math.max(0, scenarios.findIndex(s => s.id === centerId))
  const [center, setCenter] = useState(startIndex)

  // Distance between consecutive card starts (card width + gap).
  const stride = () => {
    const rail = railRef.current
    if (!rail || rail.children.length < 2) return rail?.clientWidth || 1
    return rail.children[1].offsetLeft - rail.children[0].offsetLeft
  }

  const recomputeCenter = useCallback(() => {
    const rail = railRef.current
    if (!rail) return
    const idx = Math.round(rail.scrollLeft / stride())
    const clamped = Math.max(0, Math.min(scenarios.length - 1, idx))
    setCenter(prev => (prev === clamped ? prev : clamped))
  }, [scenarios.length])

  // Jump to the requested scenario when the carousel first opens.
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    requestAnimationFrame(() => {
      rail.scrollLeft = startIndex * stride()
      setCenter(startIndex)
    })
    // Only on mount — re-centering on every prop change would fight user scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = scenarios[center]?.id
    if (id) onCenterChange?.(id)
  }, [center, scenarios, onCenterChange])

  const scrollTo = (i) => {
    railRef.current?.scrollTo({ left: i * stride(), behavior: 'smooth' })
  }

  return (
    <div className="scenario-rail" ref={railRef} onScroll={recomputeCenter}>
      {scenarios.map((s, i) => (
        <div
          key={s.id}
          className={`scenario-card${i === center ? ' is-center' : ''}`}
          onClick={() => {
            // Tapping a peeking card centres it first; tapping the centred one focuses.
            if (i === center) onFocus?.(s.id)
            else scrollTo(i)
          }}
        >
          <div className="scenario-card-inner card">
            <ScenarioPreview data={getForecastData(s.id)} />
          </div>
        </div>
      ))}
    </div>
  )
}
