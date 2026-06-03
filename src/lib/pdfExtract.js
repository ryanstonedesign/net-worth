// Client-side PDF text extraction via pdf.js. Nothing is uploaded — the file
// is read in the browser, so this keeps the app's end-to-end privacy model.
// Image-only / scanned PDFs have no text layer; those return no rows and the
// UI falls back to "paste CSV instead".
//
// pdf.js is large (~1MB), so it's dynamically imported on first use to keep it
// out of the main bundle — only people who import a PDF pay the download.
let pdfjsPromise = null
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjsLib = await import('pdfjs-dist')
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
      return pdfjsLib
    })()
  }
  return pdfjsPromise
}

// Group text items into visual lines by their y coordinate, then sort each
// line left-to-right by x. Recovers the rough table layout of a statement.
function itemsToLines(items) {
  const rows = []
  const TOL = 3 // px tolerance for "same line"
  for (const it of items) {
    const str = it.str
    if (!str || !str.trim()) continue
    const x = it.transform[4]
    const y = it.transform[5]
    let line = rows.find(r => Math.abs(r.y - y) <= TOL)
    if (!line) { line = { y, parts: [] }; rows.push(line) }
    line.parts.push({ x, str })
  }
  rows.sort((a, b) => b.y - a.y) // top of page first
  return rows.map(r =>
    r.parts.sort((a, b) => a.x - b.x).map(p => p.str).join(' ').replace(/\s+/g, ' ').trim()
  ).filter(Boolean)
}

// Pull a trailing money amount off a line: "Brokerage account 28,400.10" →
// { account: 'Brokerage account', value: '28,400.10' }. Returns null if the
// line doesn't end in something that reads like an amount.
const AMOUNT_RE = /([-(]?\s*\$?\s*\d[\d,]*(?:\.\d{1,2})?\s*\)?)\s*$/

function lineToRow(line) {
  const m = line.match(AMOUNT_RE)
  if (!m) return null
  const value = m[1].trim()
  const account = line.slice(0, m.index).trim()
  // Require a real label and a value with at least one digit run worth keeping.
  if (account.length < 2) return null
  if (!/\d/.test(value)) return null
  return [account, value]
}

/**
 * Extract structured rows + raw text from a PDF File.
 * @returns {Promise<{ rows: string[][], text: string }>}
 *   rows: best-effort [account, value] pairs (mapping {account:0, value:1})
 *   text: full extracted text (so the user can paste/correct manually)
 */
export async function extractRows(file) {
  const pdfjsLib = await loadPdfjs()
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const allLines = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    allLines.push(...itemsToLines(content.items))
  }
  const rows = []
  for (const line of allLines) {
    const row = lineToRow(line)
    if (row) rows.push(row)
  }
  return { rows, text: allLines.join('\n') }
}
