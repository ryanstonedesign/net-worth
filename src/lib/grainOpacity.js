// Prototype-only dials for how much limestone grain the two families of
// surface show. Like the chart variant, this lives in localStorage rather than
// in the synced document: it is a design control for evaluating the material,
// not user data, so it must not travel with a scenario or reach the cloud.
//
// Everything downstream is derived in CSS from these two custom properties —
// the slab veil, the forest actions' soft-light grain, and the design-system
// page all scale off them — so a slider moves a whole family together instead
// of pulling one surface out of step with its neighbours.

export const GRAIN_DIALS = [
  {
    key: 'bg',
    prop: '--grain-strength-bg',
    label: 'Background noise',
    hint: 'The page canvas, side rail, and landing surfaces.',
    def: 0.1,
  },
  {
    key: 'surface',
    prop: '--grain-strength',
    label: 'Surface noise',
    hint: 'Cards, sheets, popovers, rails, and buttons.',
    def: 0.15,
  },
]

// A ceiling rather than a limit of the effect: past this the texture stops
// reading as stone and starts reading as a filter over the UI.
export const GRAIN_MAX = 0.4

const KEY = 'wf.prototype.grain'

export const DEFAULT_GRAIN = Object.fromEntries(GRAIN_DIALS.map(d => [d.key, d.def]))

const clamp = (v, fallback) =>
  typeof v === 'number' && isFinite(v) ? Math.min(GRAIN_MAX, Math.max(0, v)) : fallback

export function readGrain() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_GRAIN }
    return Object.fromEntries(GRAIN_DIALS.map(d => [d.key, clamp(raw[d.key], d.def)]))
  } catch {
    return { ...DEFAULT_GRAIN }
  }
}

export function writeGrain(grain) {
  try { localStorage.setItem(KEY, JSON.stringify(grain)) } catch { /* private mode */ }
}

// Written onto the document element, which is where the token layer declares
// these — a deeper override would be ignored by the properties derived from
// them, since a var() inside a custom property resolves where it is declared.
// A value at its default is removed rather than pinned, so the stylesheet stays
// the source of truth until someone actually moves a slider.
export function applyGrain(grain) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  GRAIN_DIALS.forEach(d => {
    const v = grain?.[d.key]
    if (typeof v !== 'number' || v === d.def) root.style.removeProperty(d.prop)
    else root.style.setProperty(d.prop, String(v))
  })
}
