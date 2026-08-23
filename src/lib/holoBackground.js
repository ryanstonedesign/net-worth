// Prototype-only switch for the Holographic background pane: whether it runs
// its animation loop or composes a single frame and holds it. Like the grain
// and refraction dials this lives in localStorage rather than the synced
// document — it is a design control for evaluating the material, not user
// data, so it must not travel with a scenario or reach the cloud.
//
// The still frame is the same shader at the same tuned constants, drawn once.
// It exists already for `prefers-reduced-motion`; this lets the pane be held
// still deliberately, to see what the animation loop is costing the rest of
// the theme's motion.

const KEY = 'wf.prototype.holoMotion'

export const DEFAULT_HOLO_MOTION = true

export function readHoloMotion() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return DEFAULT_HOLO_MOTION
    return raw === 'true'
  } catch {
    return DEFAULT_HOLO_MOTION
  }
}

export function writeHoloMotion(animated) {
  try { localStorage.setItem(KEY, String(Boolean(animated))) } catch { /* private mode */ }
  applyHoloMotion(animated)
}

// The live value the renderer reads. It cannot go through a CSS custom
// property the way the grain dials do — it decides whether a requestAnimation-
// Frame loop runs at all — so the renderer subscribes and restarts itself.
let current = DEFAULT_HOLO_MOTION
const listeners = new Set()

export function getHoloMotion() {
  return current
}

export function subscribeHoloMotion(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function applyHoloMotion(animated) {
  current = Boolean(animated)
  listeners.forEach(fn => fn(current))
}
