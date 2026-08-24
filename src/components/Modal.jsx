import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { acquireHoloMotionPause } from '../lib/holoBackground'

const CLOSE_FALLBACK_MS = 240
const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// `footer` renders in a fixed strip below the scrollable body — for action
// rows that must stay visible while long content scrolls. `onBack` puts a
// back arrow to the left of the title for sub-views inside a modal (e.g.
// Account → Change password) that return to the parent view rather than
// closing.
export default function Modal({ title, onClose, onBack, children, footer }) {
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const overlayRef = useRef(null)
  const sheetRef = useRef(null)
  const closeTimerRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const finishClose = useCallback(() => {
    window.clearTimeout(closeTimerRef.current)
    onCloseRef.current?.()
  }, [])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    if (document.documentElement.dataset.theme !== 'holographic') {
      finishClose()
      return
    }
    closingRef.current = true
    setClosing(true)
    closeTimerRef.current = window.setTimeout(finishClose, CLOSE_FALLBACK_MS)
  }, [finishClose])

  useEffect(() => {
    const previousFocus = document.activeElement
    const root = document.getElementById('root')
    const releaseMotion = acquireHoloMotionPause()
    if (root) root.inert = true

    const focusTarget = sheetRef.current?.querySelector(
      '.modal-body input[autofocus], .modal-body textarea[autofocus], .modal-body select[autofocus], .modal-body input:not([disabled]), .modal-body select:not([disabled]), .modal-body textarea:not([disabled])',
    ) || sheetRef.current
    requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }))

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
        return
      }
      if (e.key !== 'Tab' || !sheetRef.current) return
      const focusable = [...sheetRef.current.querySelectorAll(FOCUSABLE)]
        .filter(element => !element.hasAttribute('hidden') && element.getClientRects().length > 0)
      if (!focusable.length) {
        e.preventDefault()
        sheetRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      window.clearTimeout(closeTimerRef.current)
      if (root) root.inert = false
      releaseMotion()
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [requestClose])

  // Portal to <body> so the overlay sits above the whole app-shell. Rendering it
  // inside the Dashboard left it nested in app-shell's stacking context (which
  // also has overflow:hidden); WebKit/iOS then painted the floating top nav
  // above the modal's blur. At the document root there's no such ambiguity.
  return createPortal(
    <div
      ref={overlayRef}
      className={`modal-overlay${closing ? ' is-closing' : ''}`}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget && e.animationName === 'holoBackdropOut') finishClose()
      }}
      onClick={(e) => { if (e.target === e.currentTarget) requestClose() }}
    >
      <div
        ref={sheetRef}
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Dialog'}
        tabIndex={-1}
      >
        {/* Fixed header — title top-left, bare ✕ top-right, never scrolls away */}
        <div className="modal-head">
          <div className="modal-head-lead">
            {onBack && (
              <button className="btn-icon modal-back-btn" onClick={onBack} aria-label="Back">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>
            )}
            {title ? <div className="modal-title" id={titleId}>{title}</div> : <div aria-hidden="true" />}
          </div>
          <button className="btn-icon modal-close-btn" onClick={requestClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {/* Scrollable content */}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
