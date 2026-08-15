// Prototype-only dials for the Holographic background pane. Like the grain
// dials, these live in localStorage rather than the synced document: they are
// design controls for evaluating the material, not user data, so they must not
// travel with a scenario or reach the cloud.
//
// Every value is a multiplier on the shader's own tuned constants, so 1.0 is
// always "as designed" and the stylesheet-equivalent — the shader source —
// stays the source of truth. A dial scales a whole family of folds together
// rather than pulling one out of step with its neighbours.

export const REFRACTION_DIALS = [
  {
    key: 'vibrancy',
    label: 'Refraction vibrancy',
    hint: 'How far the fold tints sit from white, and how much light they carry.',
    def: 1,
    min: 0,
    max: 2,
  },
  {
    key: 'speed',
    label: 'Refraction speed',
    hint: 'How fast the folds drift. At zero the pane holds its current angle.',
    def: 1,
    min: 0,
    max: 3,
  },
  {
    key: 'thickness',
    label: 'Refraction thickness',
    hint: 'Width of each fold — a thin filament through to a broad soft band.',
    def: 1,
    min: 0.3,
    max: 3,
  },
  {
    key: 'travel',
    label: 'Refraction travel',
    hint: 'How far a fold sweeps across the pane before it turns back.',
    def: 1,
    min: 0,
    max: 2.5,
  },
]

const KEY = 'wf.prototype.refraction'

export const DEFAULT_REFRACTION = Object.fromEntries(
  REFRACTION_DIALS.map(d => [d.key, d.def]),
)

function clampDial(dial, value) {
  if (typeof value !== 'number' || !isFinite(value)) return dial.def
  return Math.min(dial.max, Math.max(dial.min, value))
}

export function readRefraction() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_REFRACTION }
    return Object.fromEntries(REFRACTION_DIALS.map(d => [d.key, clampDial(d, raw[d.key])]))
  } catch {
    return { ...DEFAULT_REFRACTION }
  }
}

// Whether the dials are still where the shader was tuned. Drives the reset
// control's disabled state, so the button doubles as a read on whether
// anything has been moved.
export function isDefaultRefraction(values) {
  return REFRACTION_DIALS.every(d => (values?.[d.key] ?? d.def) === d.def)
}

export function writeRefraction(values) {
  try { localStorage.setItem(KEY, JSON.stringify(values)) } catch { /* private mode */ }
}

// The live values the renderer reads. These cannot go through CSS custom
// properties the way the grain dials do — they are shader uniforms — so the
// renderer samples this on every frame it draws, and the listeners exist for
// the one case that is not drawing every frame: a reduced-motion still, which
// needs a nudge to repaint after a slider moves.
let current = { ...DEFAULT_REFRACTION }
const listeners = new Set()

export function getRefraction() {
  return current
}

export function subscribeRefraction(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function applyRefraction(values) {
  current = Object.fromEntries(
    REFRACTION_DIALS.map(d => [d.key, clampDial(d, values?.[d.key])]),
  )
  listeners.forEach(fn => fn(current))
}
