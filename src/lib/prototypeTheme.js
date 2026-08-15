export const DEFAULT_PROTOTYPE_THEME = 'holographic'

export const PROTOTYPE_THEMES = [
  { value: 'holographic', label: 'Holographic' },
  { value: 'stone', label: 'Stone' },
]

const STORAGE_KEY = 'wf.prototype.theme'

function isTheme(value) {
  return PROTOTYPE_THEMES.some(theme => theme.value === value)
}

export function readPrototypeTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : DEFAULT_PROTOTYPE_THEME
  } catch {
    return DEFAULT_PROTOTYPE_THEME
  }
}

export function applyPrototypeTheme(theme) {
  const value = isTheme(theme) ? theme : DEFAULT_PROTOTYPE_THEME
  document.documentElement.dataset.theme = value
}

export function writePrototypeTheme(theme) {
  const value = isTheme(theme) ? theme : DEFAULT_PROTOTYPE_THEME
  try { localStorage.setItem(STORAGE_KEY, value) } catch { /* private mode */ }
  applyPrototypeTheme(value)
}
