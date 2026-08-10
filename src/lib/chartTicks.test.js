import { describe, it, expect } from 'vitest'
import { markerPlan, visibleMarkers } from './chartTicks'

const gaps = (xs) => xs.slice(1).map((x, i) => x - xs[i])

describe('markerPlan', () => {
  it('spaces markers evenly at every length', () => {
    for (let n = 2; n <= 60; n++) {
      for (const anchor of [0, Math.floor(n / 2), n - 1]) {
        const { markerIndices } = markerPlan(n, anchor)
        expect(new Set(gaps(markerIndices)).size, `n=${n} anchor=${anchor}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('keeps the marker count in hand on long ranges', () => {
    expect(markerPlan(12, 11).markerIndices).toHaveLength(12)
    expect(markerPlan(24, 11).markerIndices).toHaveLength(12)
    expect(markerPlan(60, 30).markerIndices.length).toBeLessThanOrEqual(12)
  })

  it('puts the anchor on the beat, and a rule through it', () => {
    for (let n = 2; n <= 60; n++) {
      const anchor = Math.floor(n / 2)
      const { markerIndices, gridIndices } = markerPlan(n, anchor)
      expect(markerIndices, `n=${n}`).toContain(anchor)
      expect(gridIndices, `n=${n}`).toContain(anchor)
    }
  })

  it('draws no more than six rules, each on a marker, evenly stepped', () => {
    for (let n = 2; n <= 60; n++) {
      const { markerIndices, gridIndices, gridStep } = markerPlan(n, n - 1)
      expect(gridIndices.length, `n=${n}`).toBeLessThanOrEqual(6)
      gridIndices.forEach(i => expect(markerIndices, `n=${n}`).toContain(i))
      gaps(gridIndices).forEach(g => expect(g, `n=${n}`).toBe(gridStep))
    }
  })

  it('survives degenerate input', () => {
    expect(markerPlan(0).markerIndices).toEqual([])
    expect(markerPlan(1, 5).markerIndices).toEqual([0])
    expect(markerPlan(8, -3).markerIndices[0]).toBe(0)
  })
})

describe('visibleMarkers', () => {
  it('leaves the rhythm alone when the selection is on the beat', () => {
    const plan = markerPlan(24, 11)
    expect(visibleMarkers(plan, 11)).toEqual(plan.markerIndices)
    expect(visibleMarkers(plan, -1)).toEqual(plan.markerIndices)
  })

  it('clears a full stride around an off-beat selection', () => {
    const plan = markerPlan(24, 11) // stride 2, markers on odd indices
    const shown = visibleMarkers(plan, 8)
    expect(shown).not.toContain(7)
    expect(shown).not.toContain(9)
    // and nothing else moves
    expect(shown).toEqual(plan.markerIndices.filter(i => i !== 7 && i !== 9))
  })
})
