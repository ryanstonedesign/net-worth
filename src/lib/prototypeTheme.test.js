import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PROTOTYPE_THEME,
  PROTOTYPE_THEMES,
  applyPrototypeTheme,
  readPrototypeTheme,
  writePrototypeTheme,
} from './prototypeTheme'

describe('prototype theme preference', () => {
  let values

  beforeEach(() => {
    values = new Map()
    vi.stubGlobal('localStorage', {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    })
    vi.stubGlobal('document', { documentElement: { dataset: {} } })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('defaults to Holographic and keeps Stone available', () => {
    expect(DEFAULT_PROTOTYPE_THEME).toBe('holographic')
    expect(PROTOTYPE_THEMES.map(theme => theme.value)).toEqual(['holographic', 'stone'])
    expect(readPrototypeTheme()).toBe('holographic')
  })

  it('restores a saved valid theme', () => {
    values.set('wf.prototype.theme', 'stone')
    expect(readPrototypeTheme()).toBe('stone')
  })

  it('falls back to Holographic for invalid values', () => {
    values.set('wf.prototype.theme', 'unknown')
    expect(readPrototypeTheme()).toBe('holographic')
    applyPrototypeTheme('unknown')
    expect(document.documentElement.dataset.theme).toBe('holographic')
  })

  it('persists and applies a selection', () => {
    writePrototypeTheme('stone')
    expect(values.get('wf.prototype.theme')).toBe('stone')
    expect(document.documentElement.dataset.theme).toBe('stone')
  })
})
