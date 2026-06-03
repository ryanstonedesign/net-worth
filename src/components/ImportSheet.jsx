import { useState } from 'react'
import Modal from './Modal'
import { formatMonthDisplay, parseAmount, getCurrentMonth } from '../utils'
import { parseDelimited, detectDelimiter, detectColumns, normalizeMonth } from '../lib/importParse'
import { suggestCategory } from '../lib/categorize'
import { extractRows } from '../lib/pdfExtract'

const SAMPLE = `Account,Balance,Category,Month
Chase Checking,5240,,2026-05
Ally Savings,16100,,2026-05
Vanguard Brokerage,28400,,2026-05
Visa,4200,,2026-05`

function cleanAmount(str) {
  // Drop accounting-style parentheses; the asset/liability type carries sign.
  return parseAmount(String(str).replace(/[()]/g, ''))
}

// Build review rows from a column mapping + data rows.
function buildReviewRows(dataRows, mapping, categories, fallbackMonth) {
  const rows = []
  dataRows.forEach((r, i) => {
    const accountName = mapping.account != null ? (r[mapping.account] ?? '').trim() : ''
    if (!accountName) return
    const value = mapping.value != null ? cleanAmount(r[mapping.value]) : 0
    const month = mapping.month != null
      ? normalizeMonth(r[mapping.month], fallbackMonth)
      : fallbackMonth

    const sug = suggestCategory(accountName, categories)
    let categoryName = sug.category
    let type = sug.type
    let confidence = sug.confidence

    if (mapping.category != null) {
      const given = (r[mapping.category] ?? '').trim()
      if (given) {
        categoryName = given
        // If the named category already exists, inherit its type.
        const existing = categories.find(c => c.name.trim().toLowerCase() === given.toLowerCase())
        if (existing) { type = existing.type; confidence = 'high' }
        else confidence = 'medium'
      }
    }

    rows.push({
      id: i,
      include: true,
      accountName,
      categoryName,
      type,
      icon: sug.icon,
      value: String(value),
      month,
      confidence,
    })
  })
  return rows
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
          {headers.map((h, i) => (
            <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
          ))}
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
  const [step, setStep] = useState('source')      // source | mapping | review | done
  const [tab, setTab] = useState('csv')           // csv | pdf
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [parsed, setParsed] = useState(null)       // { headers, dataRows, mapping }
  const [reviewRows, setReviewRows] = useState([])
  const [importedCount, setImportedCount] = useState(0)

  // Existing category names power the review-step autocomplete.
  const existingNames = categories.map(c => c.name)

  const parseText = () => {
    setError(null)
    const t = text.trim()
    if (!t) { setError('Paste some CSV first.'); return }
    const delimiter = detectDelimiter(t)
    const grid = parseDelimited(t, delimiter)
    if (grid.length === 0) { setError("Couldn't find any rows."); return }
    const det = detectColumns(grid)
    if (det.dataRows.length === 0) { setError('No data rows found below the header.'); return }
    setParsed(det)
    setStep('mapping')
  }

  const handlePdf = async (file) => {
    if (!file) return
    setBusy(true); setError(null)
    try {
      const { rows, text: raw } = await extractRows(file)
      if (rows.length === 0) {
        setError('No readable text rows found — this may be a scanned PDF. Paste the data as CSV instead.')
        setText(raw || '')
        setTab('csv')
        return
      }
      const det = detectColumns(rows)
      setParsed(det)
      setStep('mapping')
    } catch (e) {
      setError('Could not read that PDF. Try pasting the data as CSV instead.')
    } finally {
      setBusy(false)
    }
  }

  const goToReview = () => {
    if (parsed.mapping.account == null || parsed.mapping.value == null) {
      setError('Pick which columns hold the account name and the value.')
      return
    }
    setError(null)
    setReviewRows(buildReviewRows(parsed.dataRows, parsed.mapping, categories, fallbackMonth))
    setStep('review')
  }

  const setMapping = (key, val) => {
    setParsed(p => ({ ...p, mapping: { ...p.mapping, [key]: val } }))
  }

  const updateRow = (id, patch) => {
    setReviewRows(rows => rows.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  const includedRows = reviewRows.filter(r => r.include && r.accountName.trim())

  const doImport = () => {
    const rows = includedRows.map(r => ({
      categoryName: r.categoryName.trim() || 'Uncategorized',
      type: r.type,
      icon: r.icon,
      accountName: r.accountName.trim(),
      month: r.month,
      value: parseAmount(r.value),
    }))
    if (rows.length === 0) { setError('Nothing selected to import.'); return }
    onImport(rows)
    setImportedCount(rows.length)
    setStep('done')
  }

  const title =
    step === 'mapping' ? 'Match columns'
    : step === 'review' ? 'Review & categorize'
    : step === 'done' ? 'Import complete'
    : 'Import data'

  return (
    <Modal title={title} onClose={onClose}>
      {/* ── Step 1: source ── */}
      {step === 'source' && (
        <>
          <div className="type-toggle" style={{ marginBottom: 16 }}>
            <button type="button" className={`type-toggle-btn${tab === 'csv' ? ' active' : ''}`} onClick={() => { setTab('csv'); setError(null) }}>Paste CSV</button>
            <button type="button" className={`type-toggle-btn${tab === 'pdf' ? ' active' : ''}`} onClick={() => { setTab('pdf'); setError(null) }}>Upload PDF</button>
          </div>

          {tab === 'csv' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', lineHeight: 1.5, marginBottom: 12 }}>
                Paste rows from a spreadsheet or bank export. Columns are detected
                automatically — you'll confirm them next.
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
                Upload a statement PDF. The text is read on your device — nothing
                is uploaded. Scanned/image PDFs can't be read; paste CSV instead.
              </p>
              <label className="btn btn-secondary btn-full" style={{ cursor: 'pointer', display: 'block', textAlign: 'center' }}>
                {busy ? 'Reading…' : 'Choose PDF file'}
                <input
                  type="file" accept="application/pdf" style={{ display: 'none' }}
                  disabled={busy}
                  onChange={e => handlePdf(e.target.files?.[0])}
                />
              </label>
            </>
          )}

          {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
        </>
      )}

      {/* ── Step 2: column mapping ── */}
      {step === 'mapping' && parsed && (
        <>
          <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', lineHeight: 1.5, marginBottom: 16 }}>
            Tell us what each column means. {parsed.hasHeader ? 'A header row was detected.' : 'No header row was detected.'}
          </p>

          <ColumnSelect label="Account name" value={parsed.mapping.account} onChange={v => setMapping('account', v)} headers={parsed.headers} />
          <ColumnSelect label="Value / balance" value={parsed.mapping.value} onChange={v => setMapping('value', v)} headers={parsed.headers} />
          <ColumnSelect label="Category (optional)" value={parsed.mapping.category} onChange={v => setMapping('category', v)} headers={parsed.headers} optional />
          <ColumnSelect label="Month / date (optional)" value={parsed.mapping.month} onChange={v => setMapping('month', v)} headers={parsed.headers} optional />

          <div className="form-label" style={{ marginTop: 8, marginBottom: 8 }}>Preview</div>
          <div className="import-preview">
            <table>
              <tbody>
                {parsed.dataRows.slice(0, 4).map((r, i) => (
                  <tr key={i}>
                    <td>{parsed.mapping.account != null ? r[parsed.mapping.account] : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{parsed.mapping.value != null ? r[parsed.mapping.value] : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
            Check each row. Categories were guessed from the account name — fix any
            that look off. Rows marked <span style={{ color: 'var(--c-danger)' }}>?</span> are low confidence.
          </p>

          <datalist id="import-cat-options">
            {existingNames.map(n => <option key={n} value={n} />)}
          </datalist>

          <div className="import-review-list">
            {reviewRows.map(r => (
              <div key={r.id} className={`import-row${r.include ? '' : ' import-row-off'}`}>
                <div className="import-row-head">
                  <input
                    type="checkbox" checked={r.include}
                    onChange={e => updateRow(r.id, { include: e.target.checked })}
                  />
                  <input
                    className="manage-account-input" style={{ flex: 1 }}
                    value={r.accountName}
                    onChange={e => updateRow(r.id, { accountName: e.target.value })}
                  />
                  {r.confidence === 'low' && <span className="import-flag" title="Low confidence">?</span>}
                </div>
                <div className="import-row-fields">
                  <input
                    className="input import-mini import-cat" list="import-cat-options"
                    placeholder="Category"
                    value={r.categoryName}
                    onChange={e => updateRow(r.id, { categoryName: e.target.value })}
                  />
                  <div className="type-toggle import-type">
                    <button type="button" className={`type-toggle-btn${r.type === 'asset' ? ' active' : ''}`} onClick={() => updateRow(r.id, { type: 'asset' })}>Asset</button>
                    <button type="button" className={`type-toggle-btn${r.type === 'liability' ? ' active' : ''}`} onClick={() => updateRow(r.id, { type: 'liability' })}>Liab.</button>
                  </div>
                  <input
                    className="input import-mini import-value" inputMode="decimal"
                    value={r.value}
                    onChange={e => updateRow(r.id, { value: e.target.value })}
                  />
                </div>
                <div className="import-row-month">{formatMonthDisplay(r.month)}</div>
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
