import BrandLockup from './BrandLockup'
import LandingNav from './landing/LandingNav'

// One smooth curve through every point (Catmull-Rom as cubic Béziers), so the
// dots drawn at those points always sit on the line.
function curveSegments(points) {
  return points.slice(0, -1).map((p1, i) => {
    const p0 = points[i - 1] || p1
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    return `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`
  })
}

// Bi-monthly points: twelve months of history, today at the centre (x 320,
// under the "Today" label), then twelve months of projection.
const TRAJECTORY = [
  [24, 178], [73, 170], [123, 150], [172, 156], [222, 128], [271, 118], [320, 100],
  [369, 92], [419, 80], [468, 70], [518, 58], [567, 46], [616, 34],
]
const TODAY_INDEX = 6
const SEGMENTS = curveSegments(TRAJECTORY)
const HISTORY = TRAJECTORY.slice(0, TODAY_INDEX + 1)
const FORECAST = TRAJECTORY.slice(TODAY_INDEX)
const TODAY = TRAJECTORY[TODAY_INDEX]
const HISTORY_D = `M${HISTORY[0].join(' ')} ${SEGMENTS.slice(0, TODAY_INDEX).join(' ')}`
const FORECAST_D = `M${TODAY.join(' ')} ${SEGMENTS.slice(TODAY_INDEX).join(' ')}`
const AREA_D = `${HISTORY_D} L${TODAY[0]} 210 L${HISTORY[0][0]} 210 Z`

function TrajectoryPreview() {
  return (
    <div className="hlp-preview" aria-label="Worthfolio net-worth trajectory preview">
      <div className="hlp-preview__topline">
        <div>
          <span>Net worth</span>
          <strong>$495,498</strong>
        </div>
        <span className="hlp-status"><i aria-hidden="true" /> Synced</span>
      </div>

      <div className="hlp-chart">
        <div className="hlp-chart__meta">
          <span><i className="is-history" aria-hidden="true" /> History</span>
          <span><i className="is-forecast" aria-hidden="true" /> Projection</span>
        </div>
        <svg viewBox="0 0 640 236" role="img" aria-label="A rising recorded history continuing into a projected path">
          <defs>
            <linearGradient id="hlp-growth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#36d9a5" stopOpacity=".34" />
              <stop offset="1" stopColor="#36d9a5" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hlp-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#16b887" />
              <stop offset="1" stopColor="#2bdcd8" />
            </linearGradient>
            <filter id="hlp-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g className="hlp-chart__grid" aria-hidden="true">
            <line x1="20" y1="48" x2="620" y2="48" />
            <line x1="20" y1="112" x2="620" y2="112" />
            <line x1="20" y1="176" x2="620" y2="176" />
          </g>
          <path className="hlp-chart__area" d={AREA_D} />
          <path className="hlp-chart__history" d={HISTORY_D} />
          <path className="hlp-chart__forecast" d={FORECAST_D} />
          {HISTORY.slice(0, -1).map(([x, y]) => (
            <circle key={x} className="hlp-chart__history-dot" cx={x} cy={y} r="4" />
          ))}
          <g className="hlp-chart__selected" filter="url(#hlp-glow)">
            <circle cx={TODAY[0]} cy={TODAY[1]} r="12" />
            <circle cx={TODAY[0]} cy={TODAY[1]} r="5" />
          </g>
          {FORECAST.slice(1).map(([x, y]) => (
            <circle key={x} className="hlp-chart__future-dot" cx={x} cy={y} r="4.5" />
          ))}
        </svg>
        <div className="hlp-chart__axis" aria-hidden="true"><span>12 months ago</span><span>Today</span><span>12 months ahead</span></div>
      </div>

      <div className="hlp-preview__footer">
        <div><span>Assets</span><strong>$521,460</strong></div>
        <div><span>Liabilities</span><strong>$25,962</strong></div>
        <div><span>This month</span><strong className="is-positive">+$7,182</strong></div>
      </div>
    </div>
  )
}

function HistoryVisual() {
  return (
    <div className="hlp-card-visual hlp-history-visual" aria-hidden="true">
      <div className="hlp-history-visual__value"><span>Recorded history</span><strong>$284,920</strong></div>
      <svg viewBox="0 0 320 100">
        <defs>
          <linearGradient id="hlp-mini-growth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#36d9a5" stopOpacity=".3" />
            <stop offset="1" stopColor="#36d9a5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="area" d="M8 76 C48 70 60 59 92 62 S142 47 174 49 S226 32 256 35 S286 22 312 18 L312 96 L8 96 Z" />
        <path className="line" d="M8 76 C48 70 60 59 92 62 S142 47 174 49 S226 32 256 35 S286 22 312 18" />
        {[8, 92, 174, 256, 312].map((x, i) => <circle key={x} cx={x} cy={[76, 62, 49, 35, 18][i]} r="3.5" />)}
      </svg>
      <div className="hlp-months"><span>Jan</span><span>Mar</span><span>Jun</span></div>
    </div>
  )
}

// Bar lengths come from the values themselves, against the largest one.
const ACCOUNTS = [
  { label: 'Cash', amount: 23540 },
  { label: 'Investments', amount: 101126 },
  { label: 'Real estate', amount: 331135 },
  { label: 'Liabilities', amount: 25962, liability: true },
]
const ACCOUNTS_MAX = Math.max(...ACCOUNTS.map(a => a.amount))

function AccountsVisual() {
  return (
    <div className="hlp-card-visual hlp-accounts-visual" aria-hidden="true">
      {ACCOUNTS.map(({ label, amount, liability }) => (
        <div key={label} className={liability ? 'is-liability' : undefined}>
          <span>{label}</span>
          <strong>{liability ? '−' : ''}${amount.toLocaleString('en-US')}</strong>
          <i style={{ '--width': `${Math.max(4, (amount / ACCOUNTS_MAX) * 100).toFixed(1)}%` }} />
        </div>
      ))}
    </div>
  )
}

function ScenarioVisual() {
  return (
    <div className="hlp-card-visual hlp-scenario-visual" aria-hidden="true">
      <div className="hlp-scenario-visual__chips"><span>Steady path</span><span>+ $1,000/mo</span></div>
      <svg viewBox="0 0 320 112">
        <path className="history" d="M8 82 C55 78 86 70 120 60" />
        <path className="steady" d="M120 60 C176 52 224 42 312 35" />
        <path className="higher" d="M120 60 C177 45 228 26 312 12" />
        <circle cx="120" cy="60" r="5" />
      </svg>
      <div className="hlp-scenario-visual__legend"><span>Now</span><span>10 year horizon</span></div>
    </div>
  )
}

const FEATURES = [
  {
    overline: 'Monthly history',
    title: 'See change, not just a balance.',
    body: 'Record the accounts that matter on your cadence. Each month becomes a clear point in a history you own.',
    visual: <HistoryVisual />,
  },
  {
    overline: 'One legible total',
    title: 'Know what is behind the number.',
    body: 'Assets and liabilities stay individually visible while rolling into one current picture of your worth.',
    visual: <AccountsVisual />,
  },
  {
    overline: 'Scenario studio',
    title: 'Explore what could come next.',
    body: 'Compare contribution, growth, and time assumptions. Projections never overwrite the history you recorded.',
    visual: <ScenarioVisual />,
  },
]

const STEPS = [
  ['01', 'Add what matters', 'Organize your accounts, assets, and liabilities.'],
  ['02', 'Update monthly', 'Capture one calm snapshot instead of watching every tick.'],
  ['03', 'Explore the horizon', 'Compare future paths with every assumption in view.'],
]

export default function HolographicLandingPage({ scrollerRef, scrolled, onGetStarted, onSignIn }) {
  return (
    <div className="lp lp-holo" ref={scrollerRef}>
      <LandingNav
        scrolled={scrolled}
        onGetStarted={onGetStarted}
        onSignIn={onSignIn}
        principlesLabel="Why Worthfolio"
      />

      <main className="hlp-main" id="top">
        <section className="hlp-hero" aria-labelledby="hlp-hero-title">
          <div className="hlp-shell hlp-hero__grid">
            <div className="hlp-hero__copy">
              <p className="lp-stone-overline">Your net worth, month by month</p>
              <h1 id="hlp-hero-title">See where you are. Shape what’s next.</h1>
              <p className="hlp-hero__lede">
                Worthfolio turns your accounts into a clear monthly history,
                then lets you explore the paths ahead—with every assumption visible.
              </p>
              <div className="hlp-hero__actions">
                <button className="lp-stone-action lp-stone-action--primary" type="button" onClick={onGetStarted}>
                  Start your Worthfolio <span aria-hidden="true">→</span>
                </button>
                <a className="lp-stone-action lp-stone-action--quiet" href="#product">See the product</a>
              </div>
              <p className="hlp-hero__note"><span aria-hidden="true">◇</span> Built for reflection, not financial noise.</p>
            </div>
            <TrajectoryPreview />
          </div>
        </section>

        <aside className="hlp-trust" aria-label="Worthfolio product principles">
          <div className="hlp-shell">
            <span><i aria-hidden="true">01</i> Your data stays yours</span>
            <span><i aria-hidden="true">02</i> History stays distinct</span>
            <span><i aria-hidden="true">03</i> Assumptions stay visible</span>
          </div>
        </aside>

        <section className="hlp-product" id="product" aria-labelledby="hlp-product-title">
          <div className="hlp-shell">
            <div className="hlp-section-heading">
              <p className="lp-stone-overline">One system, from now to next</p>
              <h2 id="hlp-product-title">Your financial life, made legible.</h2>
              <p>Track the present, understand the past, and test the future in one calm view.</p>
            </div>
            <div className="hlp-feature-grid">
              {FEATURES.map((feature) => (
                <article className="hlp-feature-card" key={feature.title}>
                  {feature.visual}
                  <div className="hlp-feature-card__copy">
                    <p className="lp-stone-overline">{feature.overline}</p>
                    <h3>{feature.title}</h3>
                    <p>{feature.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="hlp-how" id="how-it-works" aria-labelledby="hlp-how-title">
          <div className="hlp-shell hlp-how__layout">
            <div className="hlp-section-heading">
              <p className="lp-stone-overline">How it works</p>
              <h2 id="hlp-how-title">A monthly rhythm for the long view.</h2>
            </div>
            <ol className="hlp-steps">
              {STEPS.map(([number, title, body]) => (
                <li key={number}>
                  <span>{number}</span>
                  <div><h3>{title}</h3><p>{body}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="hlp-final" id="principles" aria-labelledby="hlp-final-title">
          <div className="hlp-shell">
            <div className="hlp-final__plane">
              <div>
                <p className="lp-stone-overline">Clarity compounds</p>
                <h2 id="hlp-final-title">Give your wealth a clearer horizon.</h2>
                <p>Build a private monthly record, then explore what your next chapter could look like.</p>
              </div>
              <button className="lp-stone-action lp-stone-action--primary" type="button" onClick={onGetStarted}>
                Start your Worthfolio <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="hlp-footer">
        <div className="hlp-shell hlp-footer__inner">
          <div><BrandLockup as="a" href="#top" compact /><p>A calmer way to see your financial life through time.</p></div>
          <nav aria-label="Footer navigation"><a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#principles">Why Worthfolio</a><button type="button" onClick={onSignIn}>Sign in</button></nav>
          <p className="hlp-footer__disclosure">Illustrative examples only. Projections depend on the assumptions you choose and are not financial advice.</p>
        </div>
      </footer>
    </div>
  )
}
