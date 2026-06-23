import { useReducer, useState } from 'react'
import {
  TOKEN_GROUPS,
  getTokenValue,
  setTokenValue,
  resetToken,
  resetAllTokens,
  isTokenOverridden,
  hasOverrides,
} from '../lib/theme'

/* ── Token editors ─────────────────────────────────────────────── */

function ColorControl({ token, onEdit }) {
  const value = getTokenValue(token.var)
  const overridden = isTokenOverridden(token.var)
  return (
    <div className="ds-token">
      <label className="ds-token-swatch" style={{ background: value }}>
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={e => { setTokenValue(token.var, e.target.value); onEdit() }}
        />
      </label>
      <div className="ds-token-meta">
        <div className="ds-token-label">{token.label}</div>
        <code className="ds-token-var">{token.var}</code>
      </div>
      <input
        className="input ds-token-value"
        value={value}
        spellCheck={false}
        onChange={e => { setTokenValue(token.var, e.target.value); onEdit() }}
      />
      {overridden && (
        <button className="ds-token-reset" title="Reset to default"
          onClick={() => { resetToken(token.var); onEdit() }}>↺</button>
      )}
    </div>
  )
}

function SizeControl({ token, onEdit }) {
  const value = getTokenValue(token.var)
  const num = parseInt(value, 10) || 0
  const overridden = isTokenOverridden(token.var)
  return (
    <div className="ds-token">
      <div className="ds-token-meta">
        <div className="ds-token-label">{token.label}</div>
        <code className="ds-token-var">{token.var}</code>
      </div>
      <input
        type="range" className="ds-token-range"
        min={token.min ?? 0} max={token.max ?? 48} value={num}
        onChange={e => { setTokenValue(token.var, `${e.target.value}px`); onEdit() }}
      />
      <input
        className="input ds-token-value ds-token-value-sm"
        value={value} spellCheck={false}
        onChange={e => { setTokenValue(token.var, e.target.value); onEdit() }}
      />
      {overridden && (
        <button className="ds-token-reset" title="Reset to default"
          onClick={() => { resetToken(token.var); onEdit() }}>↺</button>
      )}
    </div>
  )
}

function TextControl({ token, onEdit }) {
  const value = getTokenValue(token.var)
  const overridden = isTokenOverridden(token.var)
  return (
    <div className="ds-token ds-token-stack">
      <div className="ds-token-meta">
        <div className="ds-token-label">{token.label}</div>
        <code className="ds-token-var">{token.var}</code>
      </div>
      <div className="ds-token-stack-row">
        <input
          className="input ds-token-value-full"
          value={value} spellCheck={false}
          onChange={e => { setTokenValue(token.var, e.target.value); onEdit() }}
        />
        {overridden && (
          <button className="ds-token-reset" title="Reset to default"
            onClick={() => { resetToken(token.var); onEdit() }}>↺</button>
        )}
      </div>
    </div>
  )
}

function TokenGroup({ group, onEdit }) {
  const Control = group.kind === 'color' ? ColorControl
    : group.kind === 'size' ? SizeControl
    : TextControl
  return (
    <div className="ds-token-group">
      <div className="ds-group-title">{group.title}</div>
      {group.tokens.map(t => (
        <Control key={t.var} token={t} onEdit={onEdit} />
      ))}
    </div>
  )
}

/* ── Gallery specimens ─────────────────────────────────────────── */

// Mirrors the real roles used across the app. Title-tier rows render in the
// title font; the rest in the body font.
const TYPE_SCALE = [
  { role: 'Display', cls: 'ds-t-display', specs: '48 / 700', font: 'Title' },
  { role: 'Title', cls: 'ds-t-title', specs: '20 / 700', font: 'Title' },
  { role: 'Heading', cls: 'ds-t-heading', specs: '17 / 700', font: 'Title' },
  { role: 'Subhead', cls: 'ds-t-subhead', specs: '15 / 700', font: 'Title' },
  { role: 'Body', cls: 'ds-t-body', specs: '15 / 500', font: 'Body' },
  { role: 'Body small', cls: 'ds-t-small', specs: '13 / 500', font: 'Body' },
  { role: 'Label', cls: 'ds-t-label', specs: '12 / 700 · caps', font: 'Body' },
  { role: 'Caption', cls: 'ds-t-caption', specs: '11 / 600', font: 'Body' },
]

function Specimen({ label, full, surface, children }) {
  return (
    <div className={'ds-specimen' + (full ? ' ds-specimen-full' : '') + (surface ? ' ds-specimen-surface' : '')}>
      <div className="ds-specimen-stage">{children}</div>
      <div className="ds-specimen-label">{label}</div>
    </div>
  )
}

function Chevron() {
  return (
    <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ToggleDemo() {
  const [v, setV] = useState('asset')
  return (
    <div className="type-toggle" style={{ width: '100%' }}>
      <button className={`type-toggle-btn${v === 'asset' ? ' active' : ''}`} onClick={() => setV('asset')}>Asset</button>
      <button className={`type-toggle-btn${v === 'liability' ? ' active' : ''}`} onClick={() => setV('liability')}>Liability</button>
    </div>
  )
}

function CheckboxDemo() {
  const [on, setOn] = useState(true)
  return (
    <label className="checkbox-row">
      <input type="checkbox" className="checkbox-input" checked={on} onChange={e => setOn(e.target.checked)} />
      <span className="checkbox-label">Contributing monthly</span>
    </label>
  )
}

function YearDemo() {
  const [y, setY] = useState('2026')
  return (
    <div className="custom-range-row" style={{ padding: 0 }}>
      <span className="custom-range-label">Estimate through end of</span>
      <input className="custom-range-input" inputMode="numeric" maxLength={4}
        value={y} onChange={e => setY(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} />
    </div>
  )
}

function Gallery() {
  return (
    <>
      <div className="ds-group-title">Buttons</div>
      <div className="ds-gallery">
        <Specimen label="btn-primary"><button className="btn btn-primary">Save Changes</button></Specimen>
        <Specimen label="btn-secondary"><button className="btn btn-secondary">Import data</button></Specimen>
        <Specimen label="btn-tertiary"><button className="btn btn-tertiary">Cancel</button></Specimen>
        <Specimen label="btn-sm"><button className="btn btn-secondary btn-sm">Add</button></Specimen>
        <Specimen label="btn-primary · disabled"><button className="btn btn-primary" disabled>Save Changes</button></Specimen>
        <Specimen label="btn-icon"><button className="btn-icon">+</button></Specimen>
      </div>

      <div className="ds-group-title">Inputs</div>
      <div className="ds-gallery">
        <Specimen label="input · primary" full>
          <input className="input" placeholder="e.g. Retirement" defaultValue="Retirement" />
        </Specimen>
        <Specimen label="input-secondary" full>
          <input className="input-secondary" placeholder="0" defaultValue="12,500" />
        </Specimen>
        <Specimen label="input · placeholder" full>
          <input className="input" placeholder="Account name" />
        </Specimen>
        <Specimen label="select" full>
          <div className="select-wrap">
            <select className="select" defaultValue="1year">
              <option value="none">None</option>
              <option value="6month">6 month</option>
              <option value="1year">1 year</option>
            </select>
            <Chevron />
          </div>
        </Specimen>
        <Specimen label="type-toggle" full><ToggleDemo /></Specimen>
        <Specimen label="checkbox-row" full><CheckboxDemo /></Specimen>
        <Specimen label="custom-range-input" full><YearDemo /></Specimen>
      </div>

      <div className="ds-group-title">Surfaces</div>
      <div className="ds-gallery">
        <Specimen label="card" full surface>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="form-label" style={{ marginBottom: 6 }}>Retirement</div>
            <div className="hero-amount" style={{ fontSize: 24, margin: 0 }}>$128,400</div>
          </div>
        </Specimen>
        <Specimen label="summary-row" full surface>
          <div className="summary-row" style={{ padding: 0, width: '100%' }}>
            <div className="card summary-cell assets">
              <div className="summary-cell-label">Assets</div>
              <div className="summary-cell-amount">$312,000</div>
            </div>
            <div className="card summary-cell liabilities">
              <div className="summary-cell-label">Liabilities</div>
              <div className="summary-cell-amount">$84,500</div>
            </div>
          </div>
        </Specimen>
      </div>

      <div className="ds-group-title">Badges</div>
      <div className="ds-gallery">
        <Specimen label="badge-asset"><span className="badge badge-asset">ASSET</span></Specimen>
        <Specimen label="badge-liability"><span className="badge badge-liability">LIABILITY</span></Specimen>
      </div>

      <div className="ds-group-title">Type scale</div>
      <div className="ds-type-list">
        {TYPE_SCALE.map(t => (
          <div className="ds-type-row" key={t.role}>
            <div className={`ds-type-sample ${t.cls}`}>{t.role}</div>
            <div className="ds-type-meta">{t.specs} · {t.font}</div>
          </div>
        ))}
      </div>

      <div className="ds-group-title">Semantic text</div>
      <div className="ds-gallery">
        <Specimen label="hero-delta · positive" full>
          <div className="hero-delta-line positive">▲ $4,200 this month</div>
        </Specimen>
        <Specimen label="hero-delta · negative" full>
          <div className="hero-delta-line negative">▼ $1,800 this month</div>
        </Specimen>
        <Specimen label="ink / ink-mute" full>
          <div>
            <div style={{ color: 'var(--c-ink)', fontSize: 15 }}>Primary ink text</div>
            <div style={{ color: 'var(--c-ink-mute)', fontSize: 13 }}>Muted secondary text</div>
          </div>
        </Specimen>
      </div>
    </>
  )
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function StickerSheet({ onClose }) {
  // Token edits mutate CSS variables imperatively; bump to refresh the controls.
  const [, bump] = useReducer(n => n + 1, 0)

  const resetAll = () => {
    if (confirm('Reset every design token to its default value?')) {
      resetAllTokens()
      bump()
    }
  }

  return (
    <div className="ds-page">
      <header className="ds-header">
        <button className="ds-back" onClick={onClose} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="ds-header-title">Design System</div>
        <button className="ds-reset-all" onClick={resetAll} disabled={!hasOverrides()}>Reset all</button>
      </header>

      <div className="ds-body">
        <p className="ds-intro">
          Edit a token below and it propagates live through every component in
          the app. Changes are saved on this device — use <strong>Reset</strong> to
          restore the originals.
        </p>

        <section className="ds-section">
          <h2 className="ds-section-title">Tokens</h2>
          {TOKEN_GROUPS.map(g => (
            <TokenGroup key={g.title} group={g} onEdit={bump} />
          ))}
        </section>

        <section className="ds-section">
          <h2 className="ds-section-title">Components</h2>
          <Gallery />
        </section>
      </div>
    </div>
  )
}
