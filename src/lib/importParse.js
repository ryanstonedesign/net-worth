// Pure, dependency-free helpers for turning pasted text (CSV/TSV) into the
// row shape the importer's review step understands. Kept side-effect free so
// it can be reasoned about (and unit-tested) in isolation.
import { getCurrentMonth } from '../utils'

const DELIMITERS = [',', '\t', ';', '|']

// Pick the delimiter that appears most consistently across the first few lines.
export function detectDelimiter(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 5)
  if (lines.length === 0) return ','
  let best = ',', bestScore = -1
  for (const d of DELIMITERS) {
    const counts = lines.map(l => l.split(d).length - 1)
    const total = counts.reduce((a, b) => a + b, 0)
    if (total === 0) continue
    // Reward consistent column counts across rows; penalise variance.
    const avg = total / counts.length
    const variance = counts.reduce((a, c) => a + (c - avg) ** 2, 0) / counts.length
    const score = total - variance
    if (score > bestScore) { bestScore = score; best = d }
  }
  return best
}

// Minimal RFC-4180-ish parser: handles quoted fields, escaped quotes (""),
// and delimiters/newlines inside quotes. Returns an array of string[] rows.
export function parseDelimited(text, delimiter = ',') {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  const pushField = () => { row.push(field); field = '' }
  const pushRow = () => { rows.push(row); row = [] }

  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += ch; i++; continue
    }
    if (ch === '"') { inQuotes = true; i++; continue }
    if (ch === delimiter) { pushField(); i++; continue }
    if (ch === '\r') { i++; continue }
    if (ch === '\n') { pushField(); pushRow(); i++; continue }
    field += ch; i++
  }
  // Flush the trailing field/row if the text didn't end on a newline.
  if (field.length > 0 || row.length > 0) { pushField(); pushRow() }
  // Drop fully empty rows (e.g. trailing blank lines).
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

// True when a cell reads as a money amount: 1,234.50  $1,200  (45.00)  -10
export function isNumericCell(str) {
  const s = String(str).trim()
  if (!s) return false
  return /^[-(]?\s*\$?\s*\d[\d,]*(\.\d+)?\s*\)?$/.test(s)
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

// True when a cell looks like a date or YYYY-MM period.
export function isDateCell(str) {
  const s = String(str).trim().toLowerCase()
  if (!s) return false
  if (/^\d{4}-\d{1,2}(-\d{1,2})?$/.test(s)) return true          // 2026-06 / 2026-06-01
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return true          // 06/01/2026
  if (new RegExp(`^(${Object.keys(MONTHS).join('|')})[a-z]*\\.?\\s+\\d{4}$`).test(s)) return true // jun 2026
  return false
}

// Coerce a wide range of date strings into the app's "YYYY-MM" month key.
export function normalizeMonth(str, fallback = getCurrentMonth()) {
  if (str == null) return fallback
  const s = String(str).trim().toLowerCase()
  if (!s) return fallback

  let m = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/)
  if (m) return `${m[1]}-${String(+m[2]).padStart(2, '0')}`

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)        // MM/DD/YYYY
  if (m) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${yr}-${String(+m[1]).padStart(2, '0')}`
  }

  m = s.match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/)            // "June 2026"
  if (m && MONTHS[m[1]]) return `${m[2]}-${String(MONTHS[m[1]]).padStart(2, '0')}`

  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return fallback
}

// ── Wide / matrix format ──────────────────────────────────────────────
// Many personal-finance sheets put MONTHS across the top as columns and
// ACCOUNTS down the side as rows, grouped by section-header rows. The helpers
// below detect and unpivot that layout into per-account rows, each carrying a
// full {month, value} history.

// A bare month label → 1..12, accepting full or abbreviated names.
export function monthNameToNum(str) {
  const s = String(str).trim().toLowerCase().replace(/[.,]/g, '')
  if (!s) return null
  return MONTHS[s.slice(0, 3)] || null
}

// True when a header cell denotes a month/period: "MARCH", "Mar", "Jun 2026",
// "2026-06", "06/01/2026".
export function isMonthHeader(str) {
  const s = String(str).trim()
  if (!s) return false
  if (isDateCell(s)) return true
  return monthNameToNum(s) != null
}

// Find the row that holds the month headers: the one (scanning the top of the
// grid) with the most month-like cells. Returns its index, or -1.
export function detectMonthHeaderRow(grid) {
  let bestRow = -1, bestCount = 1 // require at least 2 month cells
  const scan = Math.min(grid.length, 8)
  for (let r = 0; r < scan; r++) {
    const count = grid[r].filter(isMonthHeader).length
    if (count > bestCount) { bestCount = count; bestRow = r }
  }
  return bestRow
}

// Which columns in the header row are months.
function monthColumns(headerRow) {
  const cols = []
  headerRow.forEach((cell, c) => { if (isMonthHeader(cell)) cols.push(c) })
  return cols
}

// The label column: the non-month column with the most non-empty text below
// the header row. Usually the leftmost column.
export function detectLabelCol(grid, headerRowIdx, monthCols) {
  const monthSet = new Set(monthCols)
  const colCount = Math.max(...grid.map(r => r.length))
  let best = 0, bestScore = -1
  for (let c = 0; c < colCount; c++) {
    if (monthSet.has(c)) continue
    let score = 0
    for (let r = headerRowIdx + 1; r < grid.length; r++) {
      const cell = (grid[r][c] ?? '').trim()
      if (cell && !isNumericCell(cell)) score++
    }
    if (score > bestScore) { bestScore = score; best = c }
  }
  return best
}

// Resolve month-header cells into "YYYY-MM" keys. Cells that already carry a
// year are used as-is; bare month names ("MARCH") are assigned `baseYear`,
// rolling the year forward whenever the month number wraps (Dec → Jan).
export function resolveMonthHeaders(headerRow, monthCols, baseYear) {
  const out = []
  let year = baseYear
  let prevNum = null
  for (const c of monthCols) {
    const raw = String(headerRow[c]).trim()
    let monthKey = null
    if (isDateCell(raw)) {
      monthKey = normalizeMonth(raw)
      const [y, m] = monthKey.split('-').map(Number)
      year = y; prevNum = m
    } else {
      const num = monthNameToNum(raw)
      if (num != null) {
        if (prevNum != null && num <= prevNum) year++
        monthKey = `${year}-${String(num).padStart(2, '0')}`
        prevNum = num
      }
    }
    if (monthKey) out.push({ col: c, month: monthKey })
  }
  return out
}

function matrixNumber(str) {
  if (!isNumericCell(str)) return null
  const n = parseFloat(String(str).replace(/[$,()]/g, ''))
  return isNaN(n) ? null : n
}

// Rows whose label is a generic total/derived line — excluded by default but
// still shown so nothing is silently dropped.
const DERIVED_RE = /^(total\s*\$*|net\s*worth|subtotal|grand\s*total)$/i
// Rows that represent flows (contributions/spending) rather than balances.
const FLOW_RE = /(contribution|monthly\s+sav|monthly\s+giv|^giving$|large\s+expense)/i

/**
 * Unpivot a months-as-columns sheet into per-account rows.
 * @returns {{ months: {col,month}[], rows: Array<{
 *   section: string|null, accountName: string,
 *   values: {month:string,value:number}[], skipDefault: boolean, skipReason: string|null
 * }> }}
 */
export function parseMatrix(grid, { headerRowIdx, labelCol, baseYear } = {}) {
  const hdr = headerRowIdx ?? detectMonthHeaderRow(grid)
  if (hdr < 0) return { months: [], rows: [] }
  const mCols = monthColumns(grid[hdr])
  const lCol = labelCol ?? detectLabelCol(grid, hdr, mCols)
  const months = resolveMonthHeaders(grid[hdr], mCols, baseYear ?? new Date().getFullYear())

  const rows = []
  let section = null
  for (let r = hdr + 1; r < grid.length; r++) {
    const label = (grid[r][lCol] ?? '').trim()
    const values = []
    for (const { col, month } of months) {
      const n = matrixNumber(grid[r][col])
      if (n != null) values.push({ month, value: n })
    }

    if (values.length === 0) {
      // No numbers: a section header (sets the current category) or a spacer.
      if (label) section = label
      continue
    }

    let skipDefault = false, skipReason = null
    if (DERIVED_RE.test(label)) { skipDefault = true; skipReason = 'total' }
    else if (FLOW_RE.test(label)) { skipDefault = true; skipReason = 'flow' }

    rows.push({ section, accountName: label || '(unnamed)', values, skipDefault, skipReason })
  }
  return { months, rows }
}

// Decide whether a pasted grid is wide (months across columns) or long
// (one row per entry). Wide wins when a header row carries several months.
export function detectOrientation(grid) {
  const hdr = detectMonthHeaderRow(grid)
  if (hdr < 0) return 'long'
  return monthColumns(grid[hdr]).length >= 2 ? 'wide' : 'long'
}

const HEADER_HINTS = {
  account: ['account', 'name', 'description', 'institution', 'holding', 'item', 'label'],
  value: ['value', 'balance', 'amount', 'total', 'worth', 'market value', 'current'],
  category: ['category', 'type', 'group', 'class', 'bucket'],
  month: ['month', 'date', 'period', 'as of', 'asof'],
}

function headerMatch(header, hints) {
  const h = String(header).trim().toLowerCase()
  return hints.some(k => h === k || h.includes(k))
}

// Decide whether the first row is a header (no cell looks like a number).
function looksLikeHeader(firstRow) {
  if (!firstRow) return false
  const numeric = firstRow.filter(isNumericCell).length
  return numeric === 0 && firstRow.some(c => c.trim() !== '')
}

// Inspect parsed rows and guess which column means what. Returns a mapping
// object plus the data rows (header stripped) so callers can show a preview
// and let the user correct any column before committing.
export function detectColumns(allRows) {
  if (!allRows || allRows.length === 0) {
    return { hasHeader: false, headers: [], dataRows: [], mapping: { account: null, value: null, category: null, month: null } }
  }
  const colCount = Math.max(...allRows.map(r => r.length))
  const hasHeader = looksLikeHeader(allRows[0])
  const headers = hasHeader
    ? allRows[0].concat(Array(Math.max(0, colCount - allRows[0].length)).fill(''))
    : Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`)
  const dataRows = hasHeader ? allRows.slice(1) : allRows

  // Per-column content stats over the data rows.
  const stats = Array.from({ length: colCount }, (_, c) => {
    let numeric = 0, date = 0, textLen = 0, nonEmpty = 0
    for (const r of dataRows) {
      const cell = (r[c] ?? '').trim()
      if (!cell) continue
      nonEmpty++
      if (isNumericCell(cell)) numeric++
      else if (isDateCell(cell)) date++
      else textLen += cell.length
    }
    return {
      numericFrac: nonEmpty ? numeric / nonEmpty : 0,
      dateFrac: nonEmpty ? date / nonEmpty : 0,
      avgTextLen: nonEmpty ? textLen / nonEmpty : 0,
      nonEmpty,
    }
  })

  const used = new Set()
  const pickByHeader = (key) => {
    if (!hasHeader) return null
    for (let c = 0; c < colCount; c++) {
      if (used.has(c)) continue
      if (headerMatch(headers[c], HEADER_HINTS[key])) { used.add(c); return c }
    }
    return null
  }

  const mapping = { account: null, value: null, category: null, month: null }

  // 1) Honour explicit header names first.
  mapping.month = pickByHeader('month')
  mapping.category = pickByHeader('category')
  mapping.value = pickByHeader('value')
  mapping.account = pickByHeader('account')

  // 2) Fill gaps from content shape.
  if (mapping.month == null) {
    let best = null, bestFrac = 0.5
    for (let c = 0; c < colCount; c++) {
      if (used.has(c)) continue
      if (stats[c].dateFrac > bestFrac) { bestFrac = stats[c].dateFrac; best = c }
    }
    if (best != null) { mapping.month = best; used.add(best) }
  }
  if (mapping.value == null) {
    let best = null, bestFrac = 0.4
    for (let c = 0; c < colCount; c++) {
      if (used.has(c)) continue
      if (stats[c].numericFrac > bestFrac) { bestFrac = stats[c].numericFrac; best = c }
    }
    if (best != null) { mapping.value = best; used.add(best) }
  }
  if (mapping.account == null) {
    // Prefer the wordiest remaining text column.
    let best = null, bestLen = -1
    for (let c = 0; c < colCount; c++) {
      if (used.has(c)) continue
      if (stats[c].numericFrac > 0.5) continue
      if (stats[c].avgTextLen > bestLen) { bestLen = stats[c].avgTextLen; best = c }
    }
    if (best != null) { mapping.account = best; used.add(best) }
  }

  return { hasHeader, headers, dataRows, mapping }
}
