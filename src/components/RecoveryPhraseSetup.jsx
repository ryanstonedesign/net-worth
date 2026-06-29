import { useState } from 'react'
import { formatRecoveryPhrase } from '../lib/crypto'

export default function RecoveryPhraseSetup({ phrase, onDone }) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [copied, setCopied] = useState(false)
  const formatted = formatRecoveryPhrase(phrase)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const download = () => {
    const blob = new Blob(
      [`Worthfolio — Recovery Phrase\n\nKeep this somewhere safe. If you forget your password, this is the only way to recover your data.\n\n${formatted}\n`],
      { type: 'text/plain' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'net-worth-recovery.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-eyebrow">Save this</div>
        <h1 className="auth-title">Your recovery phrase</h1>
        <p className="auth-sub">
          If you forget your password, this phrase is the <strong>only</strong> way
          to get your data back. Save it in a password manager, write it down,
          or print it. We can't show it to you again.
        </p>

        <div className="recovery-phrase">{formatted}</div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={copy}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={download}>
            Download
          </button>
        </div>

        <label className="auth-warn" style={{ marginTop: 20 }}>
          <input
            type="checkbox" checked={acknowledged}
            onChange={e => setAcknowledged(e.target.checked)}
          />
          <span>I've saved my recovery phrase somewhere safe.</span>
        </label>

        <button
          type="button"
          className="btn btn-primary btn-full"
          disabled={!acknowledged}
          onClick={onDone}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
