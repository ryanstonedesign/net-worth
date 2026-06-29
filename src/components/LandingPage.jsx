import { useEffect, useRef, useState } from 'react'

/* ─────────────────────────── Inline icons ───────────────────────────
   Stroked line icons matching the app's existing iconography (24px grid,
   2px strokes, round caps). Kept local so the landing page is fully
   self-contained. */
const Icon = {
  Lock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2.5" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Trend: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 17l5-5 4 3 8-9" /><path d="M16 6h5v5" />
    </svg>
  ),
  Target: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  Layers: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 13 9 5 9-5" />
    </svg>
  ),
  Doc: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" />
    </svg>
  ),
  Devices: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="4" width="14" height="10" rx="1.5" /><path d="M2 18h10" /><rect x="16" y="9" width="6" height="11" rx="1.5" />
    </svg>
  ),
  Arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  ),
}

/* A mini net-worth line chart: a solid "history" leg that hands off to a
   dashed "forecast" leg, with an optional goal line. Pure SVG so it stays
   crisp at any tile size and needs no chart dependency. */
function MiniChart({ history, forecast, goal, width = 320, height = 120, pad = 6 }) {
  const all = [...history, ...forecast]
  const min = Math.min(...all) * 0.96
  const max = Math.max(...all, goal ?? -Infinity) * 1.02
  const span = max - min || 1
  const n = all.length
  const x = (i) => pad + (i / (n - 1)) * (width - pad * 2)
  const y = (v) => pad + (1 - (v - min) / span) * (height - pad * 2)

  const histPts = history.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  // Forecast continues from the last history point.
  const fStart = history.length - 1
  const fcPts = forecast.map((v, i) => `${x(fStart + 1 + i)},${y(v)}`)
  const fcLine = [`${x(fStart)},${y(history[fStart])}`, ...fcPts].join(' ')
  const lastX = x(n - 1)
  const lastY = y(all[n - 1])
  const areaPts = `${pad},${height - pad} ${histPts} ${fcPts.join(' ')} ${lastX},${height - pad}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="lp-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--c-primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--c-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#lp-fill)" />
      {goal != null && (
        <line x1={pad} y1={y(goal)} x2={width - pad} y2={y(goal)}
          stroke="var(--c-tertiary)" strokeWidth="1.5" strokeDasharray="2 4" opacity="0.7" />
      )}
      <polyline points={histPts} fill="none" stroke="var(--c-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={fcLine} fill="none" stroke="var(--c-secondary)" strokeWidth="2.5" strokeDasharray="3 5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx={lastX} cy={lastY} r="3.5" fill="var(--c-secondary)" stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}

/* The phone-framed dashboard preview used in the hero and the "closer look"
   gallery. A faithful-but-static recreation of the real Dashboard so visitors
   see the actual product surface without needing data. */
function PhoneMock() {
  return (
    <div className="lp-phone" role="img" aria-label="Worthfolio dashboard preview">
      <div className="lp-phone-screen">
        <div className="lp-phone-nav">
          <span className="lp-dot-row"><i /><i /><i /></span>
          <span className="lp-phone-name">Main</span>
          <span className="lp-phone-gear" />
        </div>

        <div className="lp-mock-hero">
          <div className="lp-mock-eyebrow">Net Worth</div>
          <div className="lp-mock-amount">$284,920</div>
          <div className="lp-mock-delta">+$3,140 this month</div>
          <div className="lp-mock-goal">~2 years to goal ›</div>
        </div>

        <div className="lp-mock-chart">
          <MiniChart
            history={[150, 168, 175, 190, 205, 218, 240, 261, 285]}
            forecast={[300, 318, 339, 360, 384]}
            goal={372}
            height={120}
          />
        </div>

        <div className="lp-mock-summary">
          <div className="lp-mock-summary-cell">
            <span className="lp-mock-summary-label assets">Assets</span>
            <span className="lp-mock-summary-amt">$331,400</span>
          </div>
          <div className="lp-mock-summary-cell">
            <span className="lp-mock-summary-label liab">Liabilities</span>
            <span className="lp-mock-summary-amt">$46,480</span>
          </div>
        </div>

        <div className="lp-mock-cat">
          <div className="lp-mock-cat-head">
            <span className="lp-mock-cat-icon" style={{ background: 'rgba(79,146,137,0.16)', color: 'var(--c-tertiary)' }}>📈</span>
            <span className="lp-mock-cat-name">Investments</span>
            <span className="lp-mock-cat-total">$182,300</span>
          </div>
          <div className="lp-mock-cat-row"><span>Brokerage</span><b>$121,800</b></div>
          <div className="lp-mock-cat-row"><span>Roth IRA</span><b>$60,500</b></div>
        </div>

        <div className="lp-mock-cat">
          <div className="lp-mock-cat-head">
            <span className="lp-mock-cat-icon" style={{ background: 'rgba(89,135,166,0.16)', color: 'var(--c-primary)' }}>🏦</span>
            <span className="lp-mock-cat-name">Cash</span>
            <span className="lp-mock-cat-total">$28,640</span>
          </div>
          <div className="lp-mock-cat-row"><span>Checking</span><b>$6,140</b></div>
          <div className="lp-mock-cat-row"><span>High-yield savings</span><b>$22,500</b></div>
        </div>

        <div className="lp-phone-pill">
          <span className="lp-phone-pill-arrow">‹</span>
          <span>June 2026</span>
          <span className="lp-phone-pill-arrow">›</span>
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  {
    key: 'networth', cls: 'lp-tile--xl', icon: Icon.Layers, accent: 'var(--c-primary)',
    title: 'Every account, one number',
    body: 'Group checking, brokerage, property, loans and cards into categories. Worthfolio rolls it all into a single net-worth figure that updates as you do.',
  },
  {
    key: 'forecast', cls: 'lp-tile--wide', icon: Icon.Trend, accent: 'var(--c-secondary)',
    title: 'Forecast where you’re headed',
    body: 'Set growth rates and monthly contributions and watch the dashed line project your net worth months — or decades — ahead.',
  },
  {
    key: 'goals', cls: '', icon: Icon.Target, accent: 'var(--c-tertiary)',
    title: 'Goals with a timeline',
    body: 'Pick a target and see exactly how long it takes to get there.',
  },
  {
    key: 'scenarios', cls: '', icon: Icon.Layers, accent: 'var(--c-secondary)',
    title: 'Compare scenarios',
    body: 'Fork your finances to test “what if” — save more, pay off a loan, change jobs.',
  },
  {
    key: 'encryption', cls: 'lp-tile--wide', icon: Icon.Lock, accent: 'var(--c-primary)',
    title: 'End-to-end encrypted, by design',
    body: 'Your data is encrypted on your device before it ever leaves. Not even we can read it — and a recovery phrase means only you ever can.',
  },
  {
    key: 'import', cls: '', icon: Icon.Doc, accent: 'var(--c-tertiary)',
    title: 'Import statements',
    body: 'Drop in a PDF or paste a table and let Worthfolio sort it into categories.',
  },
  {
    key: 'sync', cls: '', icon: Icon.Devices, accent: 'var(--c-primary)',
    title: 'Synced everywhere',
    body: 'Pick up on any device. Your encrypted vault follows you, always in sync.',
  },
]

/* Small bespoke visuals that live inside select bento tiles. */
function TileVisual({ k }) {
  if (k === 'networth') {
    return (
      <div className="lp-tv lp-tv-networth">
        <div className="lp-tv-eyebrow">Net Worth</div>
        <div className="lp-tv-amount">$284,920</div>
        <div className="lp-tv-delta">+$3,140 this month</div>
        <div className="lp-tv-bars">
          {[42, 58, 50, 71, 64, 83, 96].map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    )
  }
  if (k === 'forecast') {
    return (
      <div className="lp-tv lp-tv-chart">
        <MiniChart
          history={[120, 138, 150, 166, 180, 200]}
          forecast={[214, 232, 252, 274, 298]}
          goal={285}
          height={104}
        />
      </div>
    )
  }
  if (k === 'goals') {
    return (
      <div className="lp-tv lp-tv-goal">
        <div className="lp-ring">
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle className="lp-ring-track" cx="18" cy="18" r="15.5" />
            <circle className="lp-ring-fill" cx="18" cy="18" r="15.5" />
          </svg>
          <span className="lp-ring-label">68%</span>
        </div>
        <div className="lp-tv-goal-meta">
          <b>~2 years</b>
          <span>to $500k</span>
        </div>
      </div>
    )
  }
  if (k === 'scenarios') {
    return (
      <div className="lp-tv lp-tv-scenarios">
        <span className="lp-chip lp-chip-3">Pay off mortgage</span>
        <span className="lp-chip lp-chip-2">Save 20%</span>
        <span className="lp-chip lp-chip-1">Current plan</span>
      </div>
    )
  }
  if (k === 'import') {
    return (
      <div className="lp-tv lp-tv-import">
        <span className="lp-import-doc"><Icon.Doc width={20} height={20} /> statement.pdf</span>
        <Icon.Arrow className="lp-import-arrow" width={20} height={20} />
        <div className="lp-import-rows">
          <span><i style={{ background: 'var(--c-primary)' }} /> Checking</span>
          <span><i style={{ background: 'var(--c-tertiary)' }} /> Savings</span>
          <span><i style={{ background: 'var(--c-secondary)' }} /> Card</span>
        </div>
      </div>
    )
  }
  if (k === 'encryption') {
    return (
      <div className="lp-tv lp-tv-enc">
        <span className="lp-enc-badge"><Icon.Lock width={22} height={22} /></span>
        <code className="lp-enc-cipher">a9f3·c1d8·7b40·e2aa·5f91·0c6d·3e88·b4f2</code>
        <span className="lp-enc-tag">AES-256 · your keys only</span>
      </div>
    )
  }
  if (k === 'sync') {
    return (
      <div className="lp-tv lp-tv-sync">
        <Icon.Devices width={64} height={64} />
        <span className="lp-sync-ping" />
      </div>
    )
  }
  return null
}

export default function LandingPage({ onGetStarted, onSignIn }) {
  const [scrolled, setScrolled] = useState(false)
  const scrollerRef = useRef(null)

  // Toggle the frosted-nav state once the hero has scrolled past.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 24)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="lp" ref={scrollerRef}>
      {/* ── Top bar ── */}
      <header className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <a className="lp-brand" href="#top">
            <span className="lp-logo" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 16l4-5 4 3 4-7 4 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Worthfolio
          </a>
          <nav className="lp-nav-actions">
            <button className="lp-link" onClick={onSignIn}>Sign in</button>
            <button className="btn btn-primary btn-sm" onClick={onGetStarted}>Get started</button>
          </nav>
        </div>
      </header>

      <main className="lp-main" id="top">
        {/* ── Hero ── */}
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <span className="lp-badge"><Icon.Lock width={13} height={13} /> End-to-end encrypted</span>
            <div className="lp-wordmark">Worthfolio</div>
            <h1 className="lp-hero-title">Know what you’re worth — and where you’re headed.</h1>
            <p className="lp-hero-sub">
              Track every account, project your future net worth, and watch your
              wealth take shape. Private by design and synced across all your devices.
            </p>
            <div className="lp-hero-cta">
              <button className="btn btn-primary lp-cta-lg" onClick={onGetStarted}>
                Get started free <Icon.Arrow width={17} height={17} />
              </button>
              <button className="btn btn-secondary lp-cta-lg" onClick={onSignIn}>Sign in</button>
            </div>
            <p className="lp-hero-fineprint">Free to start · No bank logins · Your keys, your data</p>
          </div>
          <div className="lp-hero-art">
            <div className="lp-hero-glow" aria-hidden="true" />
            <PhoneMock />
          </div>
        </section>

        {/* ── Bento features ── */}
        <section className="lp-section">
          <div className="lp-section-head">
            <span className="lp-kicker">Everything in one place</span>
            <h2 className="lp-section-title">A complete picture of your money</h2>
            <p className="lp-section-sub">
              From today’s balance to a decades-long forecast — Worthfolio brings
              your whole financial life into one calm, private dashboard.
            </p>
          </div>

          <div className="lp-bento">
            {FEATURES.map((f) => (
              <article key={f.key} className={`card lp-tile ${f.cls}`}>
                <div className="lp-tile-icon" style={{ color: f.accent, background: `color-mix(in srgb, ${f.accent} 14%, transparent)` }}>
                  <f.icon width={22} height={22} />
                </div>
                <h3 className="lp-tile-title">{f.title}</h3>
                <p className="lp-tile-body">{f.body}</p>
                <TileVisual k={f.key} />
              </article>
            ))}
          </div>
        </section>

        {/* ── Closer look ── */}
        <section className="lp-section lp-look">
          <div className="lp-section-head">
            <span className="lp-kicker">A closer look</span>
            <h2 className="lp-section-title">Designed to feel effortless</h2>
            <p className="lp-section-sub">
              A soft, tactile interface that makes checking in on your net worth
              something you’ll actually want to do.
            </p>
          </div>
          <div className="lp-look-stage">
            <div className="lp-look-glow" aria-hidden="true" />
            <PhoneMock />
            <ul className="lp-look-points">
              <li><span className="lp-look-dot" style={{ background: 'var(--c-primary)' }} /> Live net-worth ticker with month-over-month change</li>
              <li><span className="lp-look-dot" style={{ background: 'var(--c-secondary)' }} /> Interactive trend chart with a dashed forecast</li>
              <li><span className="lp-look-dot" style={{ background: 'var(--c-tertiary)' }} /> Assets and liabilities split at a glance</li>
              <li><span className="lp-look-dot" style={{ background: 'var(--c-primary)' }} /> Scroll any month, past or projected</li>
            </ul>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="lp-final">
          <div className="card lp-final-card">
            <div className="lp-final-glow" aria-hidden="true" />
            <h2 className="lp-final-title">Start building your Worthfolio</h2>
            <p className="lp-final-sub">
              Create an encrypted vault in seconds. Free to start, and your data
              never leaves your control.
            </p>
            <div className="lp-hero-cta lp-final-cta">
              <button className="btn btn-primary lp-cta-lg" onClick={onGetStarted}>
                Get started free <Icon.Arrow width={17} height={17} />
              </button>
              <button className="btn btn-secondary lp-cta-lg" onClick={onSignIn}>I already have an account</button>
            </div>
          </div>
        </section>

        <footer className="lp-footer">
          <span className="lp-brand lp-brand--sm">
            <span className="lp-logo" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 16l4-5 4 3 4-7 4 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Worthfolio
          </span>
          <span className="lp-footer-note">Your wealth, encrypted and in focus.</span>
        </footer>
      </main>
    </div>
  )
}
