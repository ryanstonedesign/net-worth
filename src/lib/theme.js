// Design-system token registry + live theming.
//
// Every visible component in the app is driven by the CSS custom properties
// declared on :root in index.css. This module exposes those tokens so the
// Design System sticker sheet can edit them live — an edit writes the new
// value straight onto document.documentElement, so it propagates through every
// component instantly. Overrides are persisted to localStorage and re-applied
// on the next load; "reset" restores the original stylesheet values.

export const TOKEN_GROUPS = [
  {
    title: 'Brand',
    kind: 'color',
    tokens: [
      { var: '--c-primary', label: 'Primary' },
      { var: '--c-secondary', label: 'Secondary' },
      { var: '--c-tertiary', label: 'Tertiary / positive' },
      { var: '--c-danger', label: 'Danger / negative' },
    ],
  },
  {
    title: 'Neutrals & surfaces',
    kind: 'color',
    tokens: [
      { var: '--c-ink', label: 'Ink (text)' },
      { var: '--c-ink-mute', label: 'Ink muted' },
      { var: '--c-surface', label: 'Surface' },
      { var: '--c-surface-muted', label: 'Surface muted' },
      { var: '--c-border', label: 'Border' },
      { var: '--c-bg', label: 'App background' },
    ],
  },
  {
    title: 'Card',
    kind: 'color',
    tokens: [
      { var: '--card-border-color', label: 'Card border' },
    ],
  },
  {
    title: 'Shadows',
    kind: 'text',
    tokens: [
      { var: '--shadow-card', label: 'Card shadow' },
      { var: '--shadow-btn-primary', label: 'Primary button shadow' },
      { var: '--shadow-btn-secondary', label: 'Raised / secondary shadow' },
    ],
  },
  {
    title: 'Shape',
    kind: 'size',
    tokens: [
      { var: '--r-card', label: 'Card radius', min: 0, max: 48 },
      { var: '--r-btn', label: 'Button / input radius', min: 0, max: 32 },
    ],
  },
  {
    title: 'Typography',
    kind: 'text',
    tokens: [
      { var: '--font-title', label: 'Title font (display, titles, headings)' },
      { var: '--font', label: 'Body font (everything else)' },
    ],
  },
]

const STORAGE_KEY = 'nw_design_tokens'
const ALL_VARS = TOKEN_GROUPS.flatMap(g => g.tokens.map(t => t.var))

// Original stylesheet values, captured once before any override is applied.
const defaults = {}
let captured = false

function readStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

function writeStored(obj) {
  try {
    if (Object.keys(obj).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
    else localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore quota / privacy-mode errors */ }
}

// Capture the stylesheet defaults and apply any stored overrides. Call once,
// before React renders, so the app paints with the saved theme from the start.
export function initTheme() {
  if (!captured) {
    const cs = getComputedStyle(document.documentElement)
    ALL_VARS.forEach(v => { defaults[v] = cs.getPropertyValue(v).trim() })
    captured = true
  }
  const stored = readStored()
  Object.entries(stored).forEach(([v, val]) =>
    document.documentElement.style.setProperty(v, val)
  )
}

export function getDefaultValue(v) {
  return defaults[v] || ''
}

export function getTokenValue(v) {
  const inline = document.documentElement.style.getPropertyValue(v).trim()
  if (inline) return inline
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || defaults[v] || ''
}

export function setTokenValue(v, val) {
  document.documentElement.style.setProperty(v, val)
  const stored = readStored()
  stored[v] = val
  writeStored(stored)
}

export function resetToken(v) {
  document.documentElement.style.removeProperty(v)
  const stored = readStored()
  delete stored[v]
  writeStored(stored)
}

export function resetAllTokens() {
  ALL_VARS.forEach(v => document.documentElement.style.removeProperty(v))
  writeStored({})
}

export function isTokenOverridden(v) {
  return Object.prototype.hasOwnProperty.call(readStored(), v)
}

export function hasOverrides() {
  return Object.keys(readStored()).length > 0
}
