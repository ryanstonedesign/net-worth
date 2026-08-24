import BrandLockup from './BrandLockup'
import LandingNav from './landing/LandingNav'

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
          <path className="hlp-chart__area" d="M24 178 C82 168 104 174 150 140 S222 154 274 108 S336 124 368 88 L368 210 L24 210 Z" />
          <path className="hlp-chart__history" d="M24 178 C82 168 104 174 150 140 S222 154 274 108 S336 124 368 88" />
          <path className="hlp-chart__forecast" d="M368 88 C430 76 466 75 514 48 S575 40 616 24" />
          {[24, 96, 150, 218, 274, 332].map((x, index) => (
            <circle key={x} className="hlp-chart__history-dot" cx={x} cy={[178, 164, 140, 145, 108, 112][index]} r="4" />
          ))}
          <g className="hlp-chart__selected" filter="url(#hlp-glow)">
            <circle cx="368" cy="88" r="12" />
            <circle cx="368" cy="88" r="5" />
          </g>
          {[430, 492, 554, 616].map((x, index) => (
            <circle key={x} className="hlp-chart__future-dot" cx={x} cy={[77, 59, 38, 24][index]} r="4.5" />
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

function AccountsVisual() {
  return (
    <div className="hlp-card-visual hlp-accounts-visual" aria-hidden="true">
      <div><span>Cash</span><strong>$23,540</strong><i style={{ '--width': '38%' }} /></div>
      <div><span>Investments</span><strong>$101,126</strong><i style={{ '--width': '68%' }} /></div>
      <div><span>Real estate</span><strong>$331,135</strong><i style={{ '--width': '92%' }} /></div>
      <div className="is-liability"><span>Liabilities</span><strong>−$25,962</strong><i style={{ '--width': '24%' }} /></div>
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
    body: 'Compare contribution, growth, and time assumptions without confusing a calculated possibility for the recorded past.',
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
              <p className="lp-stone-overline">Private wealth clarity</p>
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
          <nav aria-label="Footer navigation"><a href="#product">Product</a><a href="#how-it-works">How it works</a><button type="button" onClick={onSignIn}>Sign in</button></nav>
          <p className="hlp-footer__disclosure">Illustrative examples only. Projections depend on the assumptions you choose and are not financial advice.</p>
        </div>
      </footer>
    </div>
  )
}
