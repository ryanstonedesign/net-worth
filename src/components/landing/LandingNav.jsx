import BrandLockup from '../BrandLockup'

export default function LandingNav({ scrolled, onGetStarted, onSignIn }) {
  return (
    <header className={`lp-stone-nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="lp-stone-shell lp-stone-nav__inner">
        <BrandLockup as="a" href="#top" compact className="lp-stone-nav__brand" />

        <nav className="lp-stone-nav__navigation" aria-label="Primary navigation">
          <div className="lp-stone-nav__anchors">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#principles">Principles</a>
          </div>
          <div className="lp-stone-nav__actions">
            <button className="lp-stone-nav__sign-in" type="button" onClick={onSignIn}>
              Sign in
            </button>
            <button
              className="lp-stone-nav__start"
              type="button"
              onClick={onGetStarted}
              aria-label="Start your Worthfolio"
            >
              <span className="lp-stone-nav__start-long">Start your Worthfolio</span>
              <span className="lp-stone-nav__start-short" aria-hidden="true">Start</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
