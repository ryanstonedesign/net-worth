import { useState, useMemo } from 'react'
import Modal from './Modal'
import { formatMonthDisplay, formatMonthShort, formatCompact, parseAmount, getCurrentMonth } from '../utils'
import {
  parseDelimited, detectDelimiter, detectColumns, detectOrientation,
  parseMatrix, normalizeMonth,
} from '../lib/importParse'
import { suggestCategory } from '../lib/categorize'
import { extractRows } from '../lib/pdfExtract'

const SAMPLE = `Feb\tMar\tApr\tMay
Account Balances
Checking\t28409\t54881\t52372\t57454
Savings\t35399\t35436\t35436\t35511
Retirement
401(k)\t38672\t37112\t38311\t38772`

function cleanAmount(str) {
  return parseAmount(String(str).replace(/[()]/g, ''))
}

// ── Long format: one review row per observation ──
function buildLongRows(dataRows, mapping, categories, fallbackMonth) {
  const rows = []
  dataRows.forEach((r, i) => {
    const accountName = mapping.account != null ? (r[mapping.account] ?? '').trim() : ''
    if (!accountName) return
    const value = mapping.value != null ? cleanAmount(r[mapping.value]) : 0
    const month = mapping.month != null ? normalizeMonth(r[mapping.month], fallbackMonth) : fallbackMonth
    const sug = suggestCategory(accountName, categories)
    let categoryName = sug.category, type = sug.type, confidence = sug.confidence
    if (mapping.category != null) {
      const given = (r[mapping.category] ?? '').trim()
      if (given) {
        categoryName = given
        const existing = categories.find(c => c.name.trim().toLowerCase() === given.toLowerCase())
        if (existing) { type = existing.type; confidence = 'high' }
        else confidence = 'medium'
      }
    }
    rows.push({ id: i, include: true, accountName, categoryName, type, icon: sug.icon, confidence, value: String(value), month })
  })
  return rows
}

// ── Wide format: one review row per account, carrying full month history ──
function buildWideRows(matrixRows, categories) {
  return matrixRows.map((r, i) => {
    const sug = suggestCategory(r.accountName, categories)
    return {
      id: i,
      include: !r.skipDefault,
      accountName: r.accountName,
      categoryName: r.section || sug.category,
      type: sug.type,
      icon: sug.icon,
      confidence: r.skipDefault ? 'low' : (r.section ? 'high' : sug.confidence),
      values: r.values,
      note: r.skipReason, // 'total' | 'flow' | null
    }
  })
}

function ColumnSelect({ label, value, onChange, headers, optional }) {
  return (
    <div className="form-group" style={{ marginBottom: 12 }}>
      <label className="form-label">{label}</label>
      <div className="select-wrap">
        <select
          className="select"
          value={value == null ? '' : String(value)}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
        >
          {optional && <option value="">— None —</option>}
          {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
        </select>
        <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}

export default function ImportSheet({ categories = [], selectedMonth, onImport, onClose }) {
  const fallbackMonth = selectedMonth || getCurrentMonth()
  const [step, setStep] = useState('source')       // source | mapping | review | done
  const [tab, setTab] = useState('csv')            // csv | pdf
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [grid, setGrid] = useState(null)
  const [orientation, setOrientation] = useState('wide')
  const [baseYear, setBaseYear] = useState(new Date().getFullYear())
  const [longDet, setLongDet] = useState(null)     // detectColumns result
  const [mapping, setMapping] = useState(null)     // long-format column mapping
  const [reviewRows, setReviewRows] = useState([])
  const [importedCount, setImportedCount] = useState(0)

  const existingNames = categories.map(c => c.name)

  // Recompute the unpivoted matrix whenever the grid or base year changes.
  const matrix = useMemo(
    () => (grid ? parseMatrix(grid, { baseYear }) : { months: [], rows: [] }),
    [grid, baseYear]
  )

  const ingestGrid = (g) => {
    if (!g || g.length === 0) { setError("Couldn't find any rows."); return }
    setGrid(g)
    const orient = detectOrientation(g)
    setOrientation(orient)
    const det = detectColumns(g)
    setLongDet(det)
    setMapping(det.mapping)
    setError(null)
    setStep('mapping')
  }

  const parseText = () => {
    const t = text.trim()
    if (!t) { setError('Paste your sheet first.'); return }
    ingestGrid(parseDelimited(t, detectDelimiter(t)))
  }

  const handlePdf = async (file) => {
    if (!file) return
    setBusy(true); setError(null)
    try {
      const { rows, text: raw } = await extractRows(file)
      if (rows.length === 0) {
        setError('No readable text rows found — this may be a scanned PDF. Paste the data instead.')
        setText(raw || ''); setTab('csv')
        return
      }
      ingestGrid(rows)
    } catch {
      setError('Could not read that PDF. Try pasting the data instead.')
    } finally {
      setBusy(false)
    }
  }

  const goToReview = () => {
    if (orientation === 'wide') {
      if (matrix.rows.length === 0) {
        setError("Couldn't find month columns. Try \"One row per entry\" instead.")
        return
      }
      setReviewRows(buildWideRows(matrix.rows, categories))
    } else {
      if (mapping.account == null || mapping.value == null) {
        setError('Pick which columns hold the account name and the value.')
        return
      }
      setReviewRows(buildLongRows(longDet.dataRows, mapping, categories, fallbackMonth))
    }
    setError(null)
    setStep('review')
  }

  const setMap = (key, val) => setMapping(m => ({ ...m, [key]: val }))
  const updateRow = (id, patch) => setReviewRows(rows => rows.map(r => r.id === id ? { ...r, ...patch } : r))

  const includedRows = reviewRows.filter(r => r.include && r.accountName.trim())

  const doImport = () => {
    const out = []
    for (const r of includedRows) {
      const categoryName = r.categoryName.trim() || 'Uncategorized'
      const vals = r.values ? r.values : [{ month: r.month, value: parseAmount(r.value) }]
      for (const v of vals) {
        if (!v.month || !Number.isFinite(v.value)) continue
        out.push({ categoryName, type: r.type, icon: r.icon, accountName: r.accountName.trim(), month: v.month, value: v.value })
      }
    }
    if (out.length === 0) { setError('Nothing selected to import.'); return }
    onImport(out)
    setImportedCount(includedRows.length)
    setStep('done')
  }

  const monthSpan = matrix.months.length
    ? `${formatMonthShort(matrix.months[0].month)} → ${formatMonthShort(matrix.months.at(-1).month)} (${matrix.months.length} ${matrix.months.length === 1 ? 'month' : 'months'})`
    : 'none found'

  const title =
    step === 'mapping' ? 'Confirm layout'
    : step === 'review' ? 'Review & categorize'
    : step === 'done' ? 'Import complete'
    : 'Import data'

  return (
    <Modal title={title} onClose={onClose}>
      {/* ── Step 1: source ── */}
      {step === 'source' && (
        <>
          <div className="type-toggle" style={{ marginBottom: 16 }}>
            <button type="button" className={`type-toggle-btn${tab === 'csv' ? ' active' : ''}`} onClick={() => { setTab('csv'); setError(null) }}>Paste sheet</button>
            <button type="button" className={`type-toggle-btn${tab === 'pdf' ? ' active' : ''}`} onClick={() => { setTab('pdf'); setError(null) }}>Upload PDF</button>
          </div>

          {tab === 'csv' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', lineHeight: 1.5, marginBottom: 12 }}>
                Select your cells in Google Sheets / Excel and paste here. Works with
                <strong style={{ color: 'var(--c-ink)' }}> months across the top</strong> and
                accounts down the side — section headers (e.g. “Retirement”) become categories.
              </p>
              <textarea
                className="input import-textarea"
                placeholder={SAMPLE}
                value={text}
                onChange={e => setText(e.target.value)}
                rows={8}
              />
              <button className="btn btn-primary btn-full" style={{ marginTop: 12 }} onClick={parseText} disabled={!text.trim()}>
                Continue
              </button>
            </>
          )}

          {tab === 'pdf' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', lineHeight: 1.5, marginBottom: 12 }}>
                Upload a statement PDF. The text is read on your device — nothing is
                uploaded. Scanned/image PDFs can't be read; paste the data instead.
              </p>
              <label className="btn btn-secondary btn-full" style={{ cursor: 'pointer', display: 'block', textAlign: 'center' }}>
                {busy ? 'Reading…' : 'Choose PDF file'}
                <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={busy} onChange={e => handlePdf(e.target.files?.[0])} />
              </label>
            </>
          )}

          {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
        </>
      )}

      {/* ── Step 2: confirm layout ── */}
      {step === 'mapping' && grid && (
        <>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Layout</label>
            <div className="type-toggle">
              <button type="button" className={`type-toggle-btn${orientation === 'wide' ? ' active' : ''}`} onClick={() => { setOrientation('wide'); setError(null) }}>Months in columns</button>
              <button type="button" className={`type-toggle-btn${orientation === 'long' ? ' active' : ''}`} onClick={() => { setOrientation('long'); setError(null) }}>One row per entry</button>
            </div>
          </div>

          {orientation === 'wide' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', lineHeight: 1.5, marginBottom: 12 }}>
                Months detected: <strong style={{ color: 'var(--c-ink)' }}>{monthSpan}</strong>.
                Section-header rows become categories.
              </p>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Starting year</label>
                <input
                  className="input" type="number" inputMode="numeric"
                  style={{ maxWidth: 140 }}
                  value={baseYear}
                  onChange={e => setBaseYear(Number(e.target.value) || baseYear)}
                />
                <p style={{ fontSize: 12, color: 'var(--c-ink-mute)', marginTop: 6, lineHeight: 1.4 }}>
                  Used when month headers have no year (e.g. “MARCH”). The year rolls
                  forward automatically each January.
                </p>
              </div>

              <div className="form-label" style={{ marginBottom: 8 }}>Preview</div>
              <div className="import-preview">
                <table>
                  <tbody>
                    {matrix.rows.slice(0, 6).map((r, i) => (
                      <tr key={i}>
                        <td style={{ color: r.skipDefault ? 'var(--c-ink-mute)' : 'var(--c-ink)' }}>{r.accountName}</td>
                        <td style={{ color: 'var(--c-ink-mute)' }}>{r.section || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{formatCompact(r.values.at(-1).value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {orientation === 'long' && longDet && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', lineHeight: 1.5, marginBottom: 16 }}>
                Tell us what each column means.
              </p>
              <ColumnSelect label="Account name" value={mapping.account} onChange={v => setMap('account', v)} headers={longDet.headers} />
              <ColumnSelect label="Value / balance" value={mapping.value} onChange={v => setMap('value', v)} headers={longDet.headers} />
              <ColumnSelect label="Category (optional)" value={mapping.category} onChange={v => setMap('category', v)} headers={longDet.headers} optional />
              <ColumnSelect label="Month / date (optional)" value={mapping.month} onChange={v => setMap('month', v)} headers={longDet.headers} optional />
            </>
          )}

          {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
          <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={goToReview}>
            Continue to review
          </button>
          <button className="auth-switch" onClick={() => { setError(null); setStep('source') }}>Back</button>
        </>
      )}

      {/* ── Step 3: review & categorize ── */}
      {step === 'review' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', lineHeight: 1.5, marginBottom: 14 }}>
            {orientation === 'wide'
              ? 'One row per account, with all months. Totals and contributions are pre-unchecked — tick anything you do want.'
              : 'Check each row and fix any category that looks off.'}
          </p>

          <datalist id="import-cat-options">
            {existingNames.map(n => <option key={n} value={n} />)}
          </datalist>

          <div className="import-review-list">
            {reviewRows.map(r => (
              <div key={r.id} className={`import-row${r.include ? '' : ' import-row-off'}`}>
                <div className="import-row-head">
                  <input type="checkbox" checked={r.include} onChange={e => updateRow(r.id, { include: e.target.checked })} />
                  <input className="manage-account-input" style={{ flex: 1 }} value={r.accountName} onChange={e => updateRow(r.id, { accountName: e.target.value })} />
                  {r.note && <span className="import-note">{r.note}</span>}
                  {!r.note && r.confidence === 'low' && <span className="import-flag" title="Low confidence">?</span>}
                </div>
                <div className="import-row-fields">
                  <input className="input import-mini import-cat" list="import-cat-options" placeholder="Category" value={r.categoryName} onChange={e => updateRow(r.id, { categoryName: e.target.value })} />
                  <div className="type-toggle import-type">
                    <button type="button" className={`type-toggle-btn${r.type === 'asset' ? ' active' : ''}`} onClick={() => updateRow(r.id, { type: 'asset' })}>Asset</button>
                    <button type="button" className={`type-toggle-btn${r.type === 'liability' ? ' active' : ''}`} onClick={() => updateRow(r.id, { type: 'liability' })}>Liab.</button>
                  </div>
                  {r.values
                    ? <span className="import-summary">{r.values.length}mo · {formatCompact(r.values.at(-1).value)}</span>
                    : <input className="input import-mini import-value" inputMode="decimal" value={r.value} onChange={e => updateRow(r.id, { value: e.target.value })} />}
                </div>
                {!r.values && <div className="import-row-month">{formatMonthDisplay(r.month)}</div>}
              </div>
            ))}
          </div>

          {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
          <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={doImport} disabled={includedRows.length === 0}>
            Import {includedRows.length} {includedRows.length === 1 ? 'account' : 'accounts'}
          </button>
          <button className="auth-switch" onClick={() => { setError(null); setStep('mapping') }}>Back</button>
        </>
      )}

      {/* ── Step 4: done ── */}
      {step === 'done' && (
        <>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--c-ink)' }}>
            Imported <strong>{importedCount}</strong> {importedCount === 1 ? 'account' : 'accounts'}.
            Categories and balances have been added to your data.
          </p>
          <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={onClose}>Done</button>
        </>
      )}
    </Modal>
  )
}
