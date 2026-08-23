import { useState } from 'react'
import Modal from './Modal'
import ImportSheet from './ImportSheet'
import { CHART_VARIANTS } from '../lib/chartVariant'
import { GRAIN_DIALS, GRAIN_MAX } from '../lib/grainOpacity'
import { PROTOTYPE_THEMES } from '../lib/prototypeTheme'
import { REFRACTION_DIALS, isDefaultRefraction } from '../lib/refraction'

export const SCENARIOS = [
  { value: 'none', label: 'None' },
  { value: 'firsttime', label: 'First time' },
  { value: '6month', label: '6 month' },
  { value: '1year', label: '1 year' },
]

// `initialView` lets the desktop settings popover jump straight to a single
// flow ('import') without going through the full settings list. (Password
// changes, the recovery phrase, and account deletion live in the Account
// modal, opened from the user popover.)
export default function PrototypeSettings({
  open, onClose, initialView = 'main',
  scenario, onScenarioChange, onSignOut,
  categories, selectedMonth, onImport, onOpenStickerSheet,
  theme, onThemeChange,
  chartVariant, onChartVariantChange,
  grain, onGrainChange,
  refraction, onRefractionChange, onRefractionReset,
  holoMotion, onHoloMotionChange,
}) {
  const [view, setView] = useState(initialView)

  const close = () => {
    setView(initialView)
    onClose?.()
  }

  if (!open) return null

  return (
    <>
      {open && view === 'import' && (
        <ImportSheet
          categories={categories || []}
          selectedMonth={selectedMonth}
          onImport={onImport}
          onClose={close}
        />
      )}

      {open && view !== 'import' && (
        <Modal title="Settings" onClose={close}>
          {view === 'main' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="scenario-select">Mock data</label>
                <div className="select-wrap">
                  <select
                    id="scenario-select"
                    className="select"
                    value={scenario}
                    onChange={e => onScenarioChange(e.target.value)}
                  >
                    {SCENARIOS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {onThemeChange && (
                <div className="form-group">
                  <label className="form-label" htmlFor="theme-select">Theme</label>
                  <div className="select-wrap">
                    <select
                      id="theme-select"
                      className="select"
                      value={theme}
                      onChange={e => onThemeChange(e.target.value)}
                    >
                      {PROTOTYPE_THEMES.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              )}

              {onChartVariantChange && (
                <div className="form-group">
                  <label className="form-label" htmlFor="chart-variant-select">Chart color</label>
                  <div className="select-wrap">
                    <select
                      id="chart-variant-select"
                      className="select"
                      value={chartVariant}
                      onChange={e => onChartVariantChange(e.target.value)}
                    >
                      {CHART_VARIANTS.map(v => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                    <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              )}

              {onGrainChange && GRAIN_DIALS.map(dial => {
                const value = grain?.[dial.key] ?? dial.def
                const pct = Math.round(value * 100)
                const max = Math.round(GRAIN_MAX * 100)
                return (
                  <div className="form-group" key={dial.key}>
                    <div className="slider-head">
                      <label className="form-label" htmlFor={`grain-${dial.key}`}>{dial.label}</label>
                      <span className="slider-value">{pct}%</span>
                    </div>
                    <input
                      id={`grain-${dial.key}`}
                      className="slider"
                      type="range"
                      min={0}
                      max={max}
                      step={1}
                      value={pct}
                      // Chromium has no ::-moz-range-progress equivalent, so the
                      // filled half of the track is painted from this.
                      style={{ '--slider-fill': `${(pct / max) * 100}%` }}
                      onChange={e => onGrainChange(dial.key, Number(e.target.value) / 100)}
                    />
                    <p className="slider-hint">{dial.hint}</p>
                  </div>
                )
              })}

              {/* Off, the pane composes one frame and holds it — the same
                  shader, the same tuning, no loop. Here to weigh what that
                  loop costs the rest of the theme's motion. */}
              {onHoloMotionChange && theme === 'holographic' && (
                <div className="sync-card" style={{ marginTop: 24, marginBottom: 24 }}>
                  <div className="sync-toggle-row">
                    <span className="sync-toggle-title">Animate background</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={holoMotion !== false}
                        onChange={e => onHoloMotionChange(e.target.checked)}
                        aria-label="Animate background"
                      />
                      <span className="switch-track" />
                      <span className="switch-thumb" />
                    </label>
                  </div>
                  <p className="sync-explain">
                    The background pane drifts continuously. Turn this off to
                    hold it on a single frame — same picture, no animation
                    loop — if scrolling or the drawer feel less than smooth.
                  </p>
                </div>
              )}

              {/* The pane these drive only exists in Holographic, so on any
                  other theme the dials would move nothing visible. */}
              {onRefractionChange && theme === 'holographic' && (
                <div className="dial-group-head">
                  <span className="form-label">Background blobs</span>
                  <button
                    type="button"
                    className="dial-reset"
                    disabled={isDefaultRefraction(refraction)}
                    onClick={() => onRefractionReset?.()}
                  >
                    Reset
                  </button>
                </div>
              )}

              {onRefractionChange && theme === 'holographic' && REFRACTION_DIALS.map(dial => {
                const value = refraction?.[dial.key] ?? dial.def
                // Shown as a percentage of the tuned design, so 100% is the
                // shader as written and the dials read against a common zero.
                const pct = Math.round(value * 100)
                return (
                  <div className="form-group" key={dial.key}>
                    <div className="slider-head">
                      <label className="form-label" htmlFor={`refraction-${dial.key}`}>{dial.label}</label>
                      <span className="slider-value">{pct}%</span>
                    </div>
                    <input
                      id={`refraction-${dial.key}`}
                      className="slider"
                      type="range"
                      min={Math.round(dial.min * 100)}
                      max={Math.round(dial.max * 100)}
                      step={5}
                      value={pct}
                      style={{
                        '--slider-fill': `${((value - dial.min) / (dial.max - dial.min)) * 100}%`,
                      }}
                      onChange={e => onRefractionChange(dial.key, Number(e.target.value) / 100)}
                    />
                    <p className="slider-hint">{dial.hint}</p>
                  </div>
                )
              })}

              {onImport && (
                <>
                  <button
                    className="btn btn-secondary btn-full"
                    style={{ marginTop: 16 }}
                    disabled={scenario !== 'none'}
                    onClick={() => setView('import')}
                  >
                    Import data
                  </button>
                  {scenario !== 'none' && (
                    <p style={{ fontSize: 13, color: 'var(--c-ink-mute)', marginTop: 8, lineHeight: 1.5 }}>
                      Switch Mock data to <strong style={{ color: 'var(--c-ink)' }}>None</strong> to
                      import into your own data.
                    </p>
                  )}
                </>
              )}

              {onOpenStickerSheet && (
                <button
                  className="btn btn-secondary btn-full"
                  style={{ marginTop: 16 }}
                  onClick={() => { onOpenStickerSheet(); close() }}
                >
                  Design system
                </button>
              )}

              {onSignOut && (
                <button
                  style={{
                    display: 'block', width: '100%', marginTop: 12, padding: '12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: 'var(--c-primary)',
                    fontFamily: 'var(--font)',
                  }}
                  onClick={() => { onSignOut(); close() }}
                >
                  Sign out
                </button>
              )}
            </>
          )}
        </Modal>
      )}
    </>
  )
}
