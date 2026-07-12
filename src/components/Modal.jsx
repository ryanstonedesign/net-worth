import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ title, onClose, children }) {
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
          {title ? <div className="modal-title">{title}</div> : <div aria-hidden="true" />}
          <button className="btn-icon modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {/* Scrollable content */}
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
