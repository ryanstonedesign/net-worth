// Prototype-only chart colour variants, kept in localStorage rather than in
// the synced document: this is a design switch for evaluating the chart, not
// user data, so it must not travel with a scenario or reach the cloud.

export const CHART_VARIANTS = [
  { value: 'multicolor', label: 'Multicolor' },
  { value: 'bronze', label: 'Bronze' },
]

export const DEFAULT_CHART_VARIANT = 'multicolor'

const KEY = 'wf.prototype.chartVariant'

export function readChartVariant() {
  try {
    const v = localStorage.getItem(KEY)
    return CHART_VARIANTS.some(o => o.value === v) ? v : DEFAULT_CHART_VARIANT
  } catch {
    return DEFAULT_CHART_VARIANT
  }
}

export function writeChartVariant(value) {
  try { localStorage.setItem(KEY, value) } catch { /* private mode */ }
}
