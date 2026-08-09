import markPrimary from '../assets/worthfolio/brand/worthfolio-mark-primary.svg'
import markFlat from '../assets/worthfolio/brand/worthfolio-mark-flat.svg'
import markReversed from '../assets/worthfolio/brand/worthfolio-mark-reversed.svg'

export default function BrandLockup({
  as: Element = 'span',
  href,
  compact = false,
  flat = false,
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
        <source
          media="(forced-colors: active), (prefers-contrast: more)"
          srcSet={markFlat}
        />
        <img
          className="brand-lockup__mark"
          src={reversed ? markReversed : flat ? markFlat : markPrimary}
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
