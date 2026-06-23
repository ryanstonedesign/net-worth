import { useState, useEffect, useRef } from 'react'

// Floating top nav, modern style: a circular menu button (top left) that opens
// the side nav, the active scenario name beside it (tap to rename), and a
// circular settings button (top right). No surface of its own — the buttons
// float over the page content.
export default function TopNav({ name, focusNameSignal, onMenu, onRename, onSettings }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef(null)
  // Seed with the mount value so we only react to genuine bumps, not to mounting.
  const lastFocusSignalRef = useRef(focusNameSignal)

  // Keep the field in sync with the shown scenario whenever we're not editing.
  useEffect(() => { if (!editing) setDraft(name) }, [name, editing])

  // When the parent bumps the signal (e.g. right after creating a scenario),
  // drop into edit mode with the name selected so it can be typed over.
  useEffect(() => {
    if (focusNameSignal === lastFocusSignalRef.current) return
    lastFocusSignalRef.current = focusNameSignal
    setEditing(true)
    setDraft(name)
    const id = requestAnimationFrame(() => {
      const el = inputRef.current
      if (el) { el.focus(); el.select() }
    })
    return () => cancelAnimationFrame(id)
  }, [focusNameSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    setEditing(false)
    const clean = draft.trim()
    if (clean && clean !== name) onRename?.(clean)
  }

  return (
    <div className="top-nav">
      <div className="top-nav-left">
        <button className="fab" onClick={onMenu} aria-label="Open scenarios menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <input
          ref={inputRef}
          className={`top-nav-name${editing ? ' editing' : ''}`}
          value={draft}
          size={Math.max(2, draft.length)}
          maxLength={40}
          aria-label="Scenario name"
          onFocus={e => { setEditing(true); e.target.select() }}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') inputRef.current?.blur()
            if (e.key === 'Escape') { setDraft(name); inputRef.current?.blur() }
          }}
        />
        {editing && (
          <button
            className="top-nav-check"
            // preventDefault keeps focus, then blur commits via onBlur (single path)
            onMouseDown={e => { e.preventDefault(); inputRef.current?.blur() }}
            aria-label="Save scenario name"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        )}
      </div>

      {onSettings && (
        <button className="fab" onClick={onSettings} aria-label="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}
    </div>
  )
}
