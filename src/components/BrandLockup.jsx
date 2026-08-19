import logoPng from '../assets/worthfolio/brand/worthfolio-logo.png'
import logoWebp from '../assets/worthfolio/brand/worthfolio-logo.webp'
import markFlat from '../assets/worthfolio/brand/worthfolio-mark-flat.svg'
import markReversed from '../assets/worthfolio/brand/worthfolio-mark-reversed.svg'

export default function BrandLockup({
  as: Element = 'span',
  href,
  compact = false,
  reversed = false,
  className = '',
}) {
  const props = href ? { href, 'aria-label': 'Worthfolio home' } : {}
  return (
    <Element
      className={`brand-lockup${compact ? ' brand-lockup--compact' : ''}${className ? ` ${className}` : ''}`}
      {...props}
    >
      <picture className="brand-lockup__picture" aria-hidden="true">
        {/* The iridescent logo carries its colour in the artwork itself, so
            forced-colours and high-contrast modes fall back to the flat mark. */}
        <source
          media="(forced-colors: active), (prefers-contrast: more)"
          srcSet={reversed ? markReversed : markFlat}
        />
        <source srcSet={logoWebp} type="image/webp" />
        <img
          className="brand-lockup__mark"
          src={logoPng}
          width="48"
          height="48"
          alt=""
          decoding="async"
        />
      </picture>
      <span className="brand-lockup__wordmark">Worthfolio</span>
    </Element>
  )
}
