import { useLayoutEffect } from 'react'

// Mirrors the surfaces that use holoCardSettleIn. Sorting their rendered
// positions gives every screen one deterministic top-to-bottom cascade without
// hard-coding category counts or maintaining long :nth-child tables in CSS.
const ENTRANCE_SELECTOR = [
  '.auth-mark',
  '.brand-lockup__picture',
  '.dashboard > .hero',
  '.dashboard > .net-worth-chart-well',
  '.card',
  '.settings-card',
  '.sync-card',
  '.import-preview',
  '.import-row',
  '.recovery-phrase',
  '.ask-consent-card',
  '.manage-cat-card',
  '.update-cat-section',
  '.empty-state',
  '.cat-card-add',
  '.ds-token-group',
  '.ds-type-list',
  '.ds-specimen',
  '.lp-stone-hero__art',
  '.lp-stone-feature__visual',
  '.lp-projection',
  '.lp-stone-rollup',
  '.lp-stone-final__plane',
  '.lp-stone-truth__list li',
  '.lp-stone-principles__list li',
  '.lp-stone-steps li',
].join(',')

function applyStagger() {
  if (document.documentElement.dataset.theme !== 'holographic') return

  const ordered = [...document.querySelectorAll(ENTRANCE_SELECTOR)]
    .map(element => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ element, rect }) => {
      const style = getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    })
    .sort((a, b) => {
      const vertical = a.rect.top - b.rect.top
      if (Math.abs(vertical) > 1) return vertical
      const horizontal = a.rect.left - b.rect.left
      if (Math.abs(horizontal) > 1) return horizontal
      return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    })

  ordered.forEach(({ element }, index) => {
    const delay = `${index * 10}ms`
    // Once an entrance has started, keep its original delay. Re-indexing an
    // existing element when a modal or lazy chart mounts can otherwise rewind
    // a CSS animation that is already in flight.
    if (!element.style.getPropertyValue('--holo-enter-stagger')) {
      element.style.setProperty('--holo-enter-stagger', delay)
    }
  })
}

export default function HoloEntranceStagger() {
  useLayoutEffect(() => {
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(applyStagger)
    }

    // The initial pass runs before paint. Later screen/card mounts are picked
    // up by the observer and receive their index during the same render turn.
    applyStagger()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    window.addEventListener('resize', schedule)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return null
}
