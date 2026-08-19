import { useEffect, useRef, useState } from 'react'
import BrandLockup from './BrandLockup'
import LandingNav from './landing/LandingNav'
import LandingSection from './landing/LandingSection'
import ProjectionPreview from './landing/ProjectionPreview'
import ResponsiveArtwork from './landing/ResponsiveArtwork'
import heroAvif from '../assets/worthfolio/art/hero-nature-valley-v2.avif'
import heroWebp from '../assets/worthfolio/art/hero-nature-valley-v2.webp'
import historyAvif from '../assets/worthfolio/art/illustration-history-v1.avif'
import historyWebp from '../assets/worthfolio/art/illustration-history-v1.webp'
import scenariosAvif from '../assets/worthfolio/art/illustration-scenarios-v1.avif'
import scenariosWebp from '../assets/worthfolio/art/illustration-scenarios-v1.webp'
import compoundingAvif from '../assets/worthfolio/art/illustration-compounding-v1.avif'
import compoundingWebp from '../assets/worthfolio/art/illustration-compounding-v1.webp'

const PRODUCT_TRUTHS = [
  {
    number: '01',
    title: 'Record monthly account values',
    body: 'Choose what belongs in your picture and update it on your cadence.',
  },
  {
    number: '02',
    title: 'Preserve a clear financial history',
    body: 'Keep each recorded month distinct from the possibilities ahead.',
  },
  {
    number: '03',
    title: 'Explore adjustable scenarios',
    body: 'Change contributions, growth rates, and time horizons without hiding the assumptions.',
  },
]

const MONTHLY_RECORD = [
  { month: 'Jan', value: '$271,840' },
  { month: 'Feb', value: '$274,190' },
  { month: 'Mar', value: '$276,060' },
  { month: 'Apr', value: '$279,510' },
  { month: 'May', value: '$281,780' },
  { month: 'Jun', value: '$284,920' },
]

const ACCOUNT_ROWS = [
  { name: 'Checking', group: 'Cash', value: '$8,250' },
  { name: 'Savings', group: 'Cash', value: '$38,500' },
  { name: 'Brokerage', group: 'Investments', value: '$167,400' },
  { name: 'Retirement', group: 'Investments', value: '$119,300' },
  { name: 'Mortgage', group: 'Liability', value: '−$48,530', liability: true },
]

const STEPS = [
  {
    number: '01',
    title: 'Add accounts',
    body: 'Organize the accounts and assets you want to include, alongside what you owe.',
  },
  {
    number: '02',
    title: 'Record a monthly snapshot',
    body: 'Enter the current value of each account to add another point to your history.',
  },
  {
    number: '03',
    title: 'Compare projections',
    body: 'Try different assumptions and see how each possible path relates to the same recorded past.',
  },
]

const PRINCIPLES = [
  ['The full history', 'See more than today’s balance by keeping every recorded month in view.'],
  ['Visible assumptions', 'Know which contribution, growth rate, and horizon shape each projection.'],
  ['Deliberate reflection', 'A monthly rhythm creates space to notice change without watching every tick.'],
  ['The long view', 'A calm, legible surface keeps attention on years rather than minutes.'],
]

export default function LandingPage({ onGetStarted, onSignIn }) {
  const [scrolled, setScrolled] = useState(false)
  const scrollerRef = useRef(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return undefined

    const handleScroll = () => setScrolled(scroller.scrollTop > 20)
    handleScroll()
    scroller.addEventListener('scroll', handleScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="lp lp-stone" ref={scrollerRef}>
      <LandingNav
        scrolled={scrolled}
        onGetStarted={onGetStarted}
        onSignIn={onSignIn}
      />

      <main className="lp-stone-main" id="top">
        <section className="lp-stone-hero" aria-labelledby="lp-hero-title">
          <div className="lp-stone-shell lp-stone-hero__grid">
            <div className="lp-stone-hero__copy">
              <p className="lp-stone-overline">Wealth planning, through time.</p>
              <h1 id="lp-hero-title">See the shape of your wealth.</h1>
              <p className="lp-stone-hero__lede">
                Record where you are each month, explore what could come next,
                and keep the long view in focus.
              </p>
              <div className="lp-stone-hero__actions">
                <button
                  className="lp-stone-action lp-stone-action--primary"
                  type="button"
                  onClick={onGetStarted}
                >
                  Start your Worthfolio
                  <span aria-hidden="true">→</span>
                </button>
                <a className="lp-stone-action lp-stone-action--quiet" href="#how-it-works">
                  See how it works
                </a>
              </div>
            </div>

            <figure className="lp-stone-hero__art">
              <ResponsiveArtwork
                avif={heroAvif}
                webp={heroWebp}
                width="1672"
                height="941"
                alt="A limestone relief of a long path winding through a mountain valley toward the horizon"
                priority
              />
              <figcaption>A long view, shaped one month at a time.</figcaption>
            </figure>
          </div>
        </section>

        <LandingSection
          id="product"
          className="lp-stone-truth"
          labelledBy="lp-product-title"
        >
          <div className="lp-stone-section-heading lp-stone-section-heading--wide">
            <p className="lp-stone-overline">What Worthfolio does</p>
            <h2 id="lp-product-title">A financial record with time built in.</h2>
          </div>
          <ol className="lp-stone-truth__list">
            {PRODUCT_TRUTHS.map((item) => (
              <li key={item.number}>
                <span className="lp-stone-index" aria-hidden="true">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
        </LandingSection>

        <LandingSection
          id="history"
          className="lp-stone-feature"
          labelledBy="lp-history-title"
        >
          <div className="lp-stone-feature__copy">
            <p className="lp-stone-overline">Monthly history</p>
            <h2 id="lp-history-title">A record you own, one month at a time.</h2>
            <p>
              Enter account values deliberately and Worthfolio places each
              snapshot into a continuous history. You decide what to track and
              when to update it.
            </p>
            <p>
              Recorded months stay visually distinct from calculated future
              possibilities, so the past never blurs into a projection.
            </p>
          </div>

          <div className="lp-stone-feature__visual">
            <ResponsiveArtwork
              avif={historyAvif}
              webp={historyWebp}
              width="1448"
              height="1086"
              alt="Limestone layers crossed by a dark green line with a sequence of monthly points"
            />
            <div className="lp-stone-history-proof" aria-label="Illustrative six-month worth history">
              <div className="lp-stone-history-proof__heading">
                <span>Recorded history</span>
                <strong>Jan–Jun</strong>
              </div>
              <ol>
                {MONTHLY_RECORD.map((item, index) => (
                  <li key={item.month} className={index === MONTHLY_RECORD.length - 1 ? 'is-current' : ''}>
                    <span>{item.month}</span>
                    <i aria-hidden="true" />
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </LandingSection>

        <LandingSection
          id="scenarios"
          className="lp-stone-scenarios"
          labelledBy="lp-scenarios-title"
        >
          <div className="lp-stone-feature lp-stone-feature--reverse">
            <div className="lp-stone-feature__copy">
              <p className="lp-stone-overline">Scenario studio</p>
              <h2 id="lp-scenarios-title">Explore the paths, and see what shapes them.</h2>
              <p>
                Begin with the same recorded history, then compare possible
                directions. Every scenario keeps its contribution, annual growth
                rate, starting balance, and horizon in sight.
              </p>
              <p>
                Change one assumption at a time or create a different set. The
                result remains a conditional projection—not a promise.
              </p>
            </div>
            <ResponsiveArtwork
              className="lp-stone-feature__visual"
              avif={scenariosAvif}
              webp={scenariosWebp}
              width="1448"
              height="1086"
              alt="A carved path branching into several routes, with one path inlaid in deep green"
            />
          </div>
          <ProjectionPreview />
        </LandingSection>

        <LandingSection
          id="accounts"
          className="lp-stone-accounts"
          labelledBy="lp-accounts-title"
        >
          <div className="lp-stone-accounts__intro">
            <p className="lp-stone-overline">One inspectable total</p>
            <h2 id="lp-accounts-title">See the accounts behind your worth.</h2>
            <p>
              Assets and liabilities remain individually legible while rolling
              into one current total. Nothing is hidden behind a single number.
            </p>
          </div>

          <div className="lp-stone-rollup" data-surface="recessed">
            <table>
              <caption>Illustrative account rollup</caption>
              <thead>
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col">Group</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {ACCOUNT_ROWS.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">{row.name}</th>
                    <td>{row.group}</td>
                    <td className={row.liability ? 'is-liability' : ''}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan="2">Total worth</th>
                  <td>$284,920</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </LandingSection>

        <LandingSection
          id="compounding"
          className="lp-stone-feature lp-stone-compounding"
          labelledBy="lp-compounding-title"
        >
          <ResponsiveArtwork
            className="lp-stone-feature__visual"
            avif={compoundingAvif}
            webp={compoundingWebp}
            width="1448"
            height="1086"
            alt="A limestone staircase following a deep green path toward a circular opening"
          />
          <div className="lp-stone-feature__copy">
            <p className="lp-stone-overline">Consistency and time</p>
            <h2 id="lp-compounding-title">Small steps become a longer path.</h2>
            <p>
              A monthly record makes gradual change visible. Scenario projections
              let you study how contributions, time, and an assumed growth rate
              can interact over years.
            </p>
            <p>
              Worthfolio does not predict returns. It gives your assumptions a
              clear place to be seen, changed, and compared.
            </p>
          </div>
        </LandingSection>

        <LandingSection
          id="how-it-works"
          className="lp-stone-walkthrough"
          labelledBy="lp-how-title"
        >
          <div className="lp-stone-section-heading">
            <p className="lp-stone-overline">How it works</p>
            <h2 id="lp-how-title">A simple rhythm for the long view.</h2>
          </div>
          <ol className="lp-stone-steps">
            {STEPS.map((step) => (
              <li key={step.number}>
                <span className="lp-stone-step-number" aria-hidden="true">{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </LandingSection>

        <LandingSection
          id="principles"
          className="lp-stone-principles"
          labelledBy="lp-principles-title"
        >
          <div className="lp-stone-section-heading lp-stone-section-heading--wide">
            <p className="lp-stone-overline">Built around perspective</p>
            <h2 id="lp-principles-title">Your financial life deserves a quieter frame.</h2>
          </div>
          <ul className="lp-stone-principles__list">
            {PRINCIPLES.map(([title, body], index) => (
              <li key={title}>
                <span className="lp-stone-index" aria-hidden="true">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ul>
        </LandingSection>

        <section className="lp-stone-final" aria-labelledby="lp-final-title">
          <div className="lp-stone-shell">
            <div className="lp-stone-final__plane">
              <p className="lp-stone-overline">Build with the long view</p>
              <h2 id="lp-final-title">Make time part of the picture.</h2>
              <p>
                Begin a monthly record, then explore possible paths with the
                assumptions kept in plain sight.
              </p>
              <button
                className="lp-stone-action lp-stone-action--light"
                type="button"
                onClick={onGetStarted}
              >
                Start your Worthfolio
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-stone-footer">
        <div className="lp-stone-shell lp-stone-footer__inner">
          <div className="lp-stone-footer__brand">
            <BrandLockup as="a" href="#top" compact />
            <p>A calm record of your financial life, through time.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#principles">Principles</a>
          </nav>
          <p className="lp-stone-footer__disclosure">
            Examples on this page are illustrative. Projections are calculated
            from assumptions you choose; they are not guarantees or financial advice.
          </p>
        </div>
      </footer>
    </div>
  )
}
