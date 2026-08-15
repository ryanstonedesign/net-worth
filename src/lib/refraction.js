// Prototype-only dials for the Holographic background pane. Like the grain
// dials, these live in localStorage rather than the synced document: they are
// design controls for evaluating the material, not user data, so they must not
// travel with a scenario or reach the cloud.
//
// The module and its storage key still say "refraction", from the pane's
// previous incarnation. The keys are deliberately left alone: renaming them
// would orphan every value anyone has already dialled in.
//
// Every value is a multiplier on the shader's own tuned constants, so 1.0 is
// always "as designed" and the stylesheet-equivalent — the shader source —
// stays the source of truth. A dial moves the whole set of blobs together
// rather than pulling one out of step with its neighbours.

export const REFRACTION_DIALS = [
  {
    key: 'vibrancy',
    label: 'Blob colour',
    hint: 'How much of the accent the blobs carry. At zero the pane is bare.',
    def: 1,
    min: 0,
    max: 2,
  },
  {
    key: 'speed',
    label: 'Blob speed',
    hint: 'How fast they drift and change shape. At zero the pane holds still.',
    def: 1,
    min: 0,
    max: 3,
  },
  {
    key: 'thickness',
    label: 'Blob size',
    hint: 'How large each one is — separate shapes through to one soft wash.',
    def: 1,
    min: 0.3,
    max: 3,
  },
  {
    key: 'travel',
    label: 'Blob travel',
    hint: 'How far each one roams from where it sits.',
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
