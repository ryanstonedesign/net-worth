import { describe, it, expect, vi } from 'vitest'
import {
  BLOB_COUNT,
  advanceBlobFadeStates,
  blobFadeOpacity,
  bufferSize,
  createBlobFadeStates,
} from './pearlescent'

const MAX = 480000

describe('bufferSize', () => {
  it('renders a small viewport at full device resolution', () => {
    // 390x844 at 1x is well inside the budget, so nothing is scaled away.
    expect(bufferSize(390, 844, 1)).toEqual({ width: 390, height: 844 })
  })

  it('never exceeds the fragment budget, however dense the display', () => {
    for (const [w, h, dpr] of [[390, 844, 3], [430, 932, 2], [1920, 1080, 2], [3440, 1440, 1]]) {
      const size = bufferSize(w, h, dpr)
      expect(size.width * size.height).toBeLessThanOrEqual(MAX * 1.01)
    }
  })

  it('keeps the viewport aspect ratio when it scales down', () => {
    const size = bufferSize(1920, 1080, 2)
    expect(size.width / size.height).toBeCloseTo(1920 / 1080, 2)
  })

  it('caps device pixel ratio so a 3x phone is not three times the work', () => {
    expect(bufferSize(300, 400, 3)).toEqual(bufferSize(300, 400, 2))
  })

  it('treats a missing or sub-1 ratio as 1x', () => {
    expect(bufferSize(300, 400, undefined)).toEqual({ width: 300, height: 400 })
    expect(bufferSize(300, 400, 0.5)).toEqual({ width: 300, height: 400 })
  })

  it('stays above zero for a collapsed viewport', () => {
    const size = bufferSize(0, 0, 1)
    expect(size.width).toBeGreaterThanOrEqual(2)
    expect(size.height).toBeGreaterThanOrEqual(2)
  })
})

describe('blob fade cadence', () => {
  it('starts the field across independent phases with opacity bounded from zero to one', () => {
    const states = createBlobFadeStates(() => 0)
    const opacity = Array.from(advanceBlobFadeStates(states, 0, () => 0))

    expect(states).toHaveLength(BLOB_COUNT)
    expect(opacity.every(value => value >= 0 && value <= 1)).toBe(true)
    expect(opacity).toContain(0)
    expect(opacity).toContain(1)
  })

  it('smoothly crosses the midpoint of a fade', () => {
    expect(blobFadeOpacity({ phase: 'fade-in', duration: 10, elapsed: 5 })).toBeCloseTo(0.5)
    expect(blobFadeOpacity({ phase: 'fade-out', duration: 10, elapsed: 5 })).toBeCloseTo(0.5)
  })

  it('chooses a fresh randomized duration whenever a phase completes', () => {
    const states = [{ phase: 'hidden', duration: 1, elapsed: 0 }]
    const random = vi.fn(() => 0.5)
    const [opacity] = advanceBlobFadeStates(states, 2, random)

    expect(states[0].phase).toBe('fade-in')
    expect(states[0].duration).toBe(11)
    expect(states[0].elapsed).toBe(1)
    expect(opacity).toBeGreaterThan(0)
    expect(opacity).toBeLessThan(1)
    expect(random).toHaveBeenCalledOnce()
  })

  it('freezes the cadence when the scaled delta is zero', () => {
    const states = [{ phase: 'fade-in', duration: 10, elapsed: 3 }]
    const before = blobFadeOpacity(states[0])
    const [after] = advanceBlobFadeStates(states, 0, () => 0)

    expect(states[0].elapsed).toBe(3)
    expect(after).toBeCloseTo(before)
  })
})
