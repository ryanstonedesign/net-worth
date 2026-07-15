import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// `footer` renders in a fixed strip below the scrollable body — for action
// rows that must stay visible while long content scrolls. `onBack` puts a
// back arrow to the left of the title for sub-views inside a modal (e.g.
// Account → Change password) that return to the parent view rather than
// closing.
export default function Modal({ title, onClose, onBack, children, footer }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Portal to <body> so the overlay sits above the whole app-shell. Rendering it
  // inside the Dashboard left it nested in app-shell's stacking context (which
  // also has overflow:hidden); WebKit/iOS then painted the floating top nav
  // above the modal's blur. At the document root there's no such ambiguity.
  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-sheet">
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
            {title ? <div className="modal-title">{title}</div> : <div aria-hidden="true" />}
          </div>
          <button className="btn-icon modal-close-btn" onClick={onClose} aria-label="Close">
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
