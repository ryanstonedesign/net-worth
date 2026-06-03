import { useRef } from 'react'

// Recovery phrase: 32 hex chars. Display in groups of 4 separated by hyphens.
// We accept any input — hex, lowercase, with or without hyphens, pasted —
// strip everything down to hex chars, then re-format for display.

function format(raw) {
  return (raw.toUpperCase().match(/.{1,4}/g) || []).join('-')
}

function normalize(value) {
  return (value || '').replace(/[^a-f0-9]/gi, '').toLowerCase().slice(0, 32)
}

export default function RecoveryPhraseInput({ value, onChange, autoFocus, required }) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    onChange(normalize(e.target.value))
  }

  return (
    <input
      ref={inputRef}
      className="input"
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        letterSpacing: '0.04em',
      }}
      type="text"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      inputMode="text"
      placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
      maxLength={39}
      value={format(value)}
      onChange={handleChange}
      autoFocus={autoFocus}
      required={required}
    />
  )
}
