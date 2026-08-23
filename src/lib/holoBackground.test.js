import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_HOLO_MOTION,
  applyHoloMotion,
  getHoloMotion,
  readHoloMotion,
  subscribeHoloMotion,
  writeHoloMotion,
} from './holoBackground'

describe('holographic background motion preference', () => {
  let values

  beforeEach(() => {
    values = new Map()
    vi.stubGlobal('localStorage', {
      getItem: key => (values.has(key) ? values.get(key) : null),
      setItem: (key, value) => values.set(key, value),
    })
    applyHoloMotion(DEFAULT_HOLO_MOTION)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('animates by default, with nothing stored', () => {
    expect(DEFAULT_HOLO_MOTION).toBe(true)
    expect(readHoloMotion()).toBe(true)
  })

  it('restores a stored choice either way', () => {
    values.set('wf.prototype.holoMotion', 'false')
    expect(readHoloMotion()).toBe(false)
    values.set('wf.prototype.holoMotion', 'true')
    expect(readHoloMotion()).toBe(true)
  })

  it('treats anything unrecognised as off rather than throwing', () => {
    values.set('wf.prototype.holoMotion', 'perhaps')
    expect(readHoloMotion()).toBe(false)
  })

  it('falls back to the default when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('private mode') },
      setItem: () => { throw new Error('private mode') },
    })
    expect(readHoloMotion()).toBe(DEFAULT_HOLO_MOTION)
    expect(() => writeHoloMotion(false)).not.toThrow()
  })

  it('persists, applies, and notifies the renderer on a write', () => {
    const seen = []
    const unsubscribe = subscribeHoloMotion(v => seen.push(v))
    writeHoloMotion(false)
    expect(values.get('wf.prototype.holoMotion')).toBe('false')
    expect(getHoloMotion()).toBe(false)
    expect(seen).toEqual([false])
    unsubscribe()
    writeHoloMotion(true)
    expect(seen).toEqual([false])
    expect(getHoloMotion()).toBe(true)
  })
})
