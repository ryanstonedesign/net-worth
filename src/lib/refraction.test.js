import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  REFRACTION_DIALS, DEFAULT_REFRACTION,
  readRefraction, writeRefraction,
  getRefraction, applyRefraction, subscribeRefraction, isDefaultRefraction,
} from './refraction'

const KEY = 'wf.prototype.refraction'

// The suite runs without a DOM, same as the other preference tests.
let values

beforeEach(() => {
  values = new Map()
  vi.stubGlobal('localStorage', {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  })
  applyRefraction(DEFAULT_REFRACTION)
})

afterEach(() => vi.unstubAllGlobals())

describe('readRefraction', () => {
  it('falls back to the tuned design when nothing is stored', () => {
    expect(readRefraction()).toEqual(DEFAULT_REFRACTION)
    expect(DEFAULT_REFRACTION).toEqual({ vibrancy: 1, speed: 1, thickness: 1, travel: 1 })
  })

  it('falls back on unparseable or non-object storage', () => {
    values.set(KEY, 'not json')
    expect(readRefraction()).toEqual(DEFAULT_REFRACTION)
    values.set(KEY, '"a string"')
    expect(readRefraction()).toEqual(DEFAULT_REFRACTION)
  })

  it('clamps every dial into its own range', () => {
    values.set(KEY, JSON.stringify({
      vibrancy: 99, speed: -4, thickness: 0, travel: 1000,
    }))
    const read = readRefraction()
    REFRACTION_DIALS.forEach(d => {
      expect(read[d.key]).toBeGreaterThanOrEqual(d.min)
      expect(read[d.key]).toBeLessThanOrEqual(d.max)
    })
    expect(read.thickness).toBe(0.3) // floored, not left at zero
  })

  it('replaces missing and non-numeric dials with their default', () => {
    values.set(KEY, JSON.stringify({ vibrancy: 1.5, speed: 'fast' }))
    expect(readRefraction()).toEqual({ ...DEFAULT_REFRACTION, vibrancy: 1.5 })
  })

  it('round-trips a written value', () => {
    writeRefraction({ vibrancy: 0.5, speed: 2, thickness: 0.4, travel: 1.5 })
    expect(readRefraction()).toEqual({ vibrancy: 0.5, speed: 2, thickness: 0.4, travel: 1.5 })
  })
})

describe('isDefaultRefraction', () => {
  it('is true for the defaults and for a missing set', () => {
    expect(isDefaultRefraction(DEFAULT_REFRACTION)).toBe(true)
    expect(isDefaultRefraction(undefined)).toBe(true)
  })

  it('is false as soon as any single dial has moved', () => {
    REFRACTION_DIALS.forEach(d => {
      const moved = { ...DEFAULT_REFRACTION, [d.key]: d.max }
      expect(isDefaultRefraction(moved)).toBe(false)
    })
  })
})

describe('applyRefraction', () => {
  it('publishes clamped values for the renderer to sample', () => {
    applyRefraction({ vibrancy: 5, speed: 2, thickness: 1, travel: 1 })
    expect(getRefraction().vibrancy).toBe(2)
    expect(getRefraction().speed).toBe(2)
  })

  it('notifies subscribers until they unsubscribe', () => {
    const seen = []
    const off = subscribeRefraction(v => seen.push(v.thickness))
    applyRefraction({ ...DEFAULT_REFRACTION, thickness: 2 })
    off()
    applyRefraction({ ...DEFAULT_REFRACTION, thickness: 3 })
    expect(seen).toEqual([2])
  })

  it('leaves every dial defined even when handed nothing', () => {
    applyRefraction(undefined)
    expect(getRefraction()).toEqual(DEFAULT_REFRACTION)
  })
})
