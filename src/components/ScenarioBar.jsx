import { useState, useEffect, useRef } from 'react'

// Dark bar pinned to the top, sharing the floating month selector's ink colour.
// Left: the scenario name as an always-present input styled like a title — tap
// it to rename (the tap lands on a real field, so mobile keyboards open right
// away), with a check to save. Right: a "+" to create a scenario when focused,
// which becomes a delete control while switching. The switch icon (focused only)
// enters the switcher; in the switcher you exit by tapping a card.
export default function ScenarioBar({
  name, switching, focusNameSignal, onToggleSwitch, onAdd, onDelete, canDelete, onRename, onSettings,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef(null)
  // Timestamp of the last save. Committing swaps the check button back to the
  // switch icon in the same spot, so the tap's click can land on the freshly
  // rendered switch icon — ignore a toggle that fires right after a save.
  const lastCommitRef = useRef(0)

  // Keep the field in sync with the shown scenario whenever we're not editing.
  useEffect(() => { if (!editing) setDraft(name) }, [name, editing])

  // When the parent bumps the signal (e.g. right after creating a scenario),
  // drop into edit mode with the name selected so it can be typed over.
  useEffect(() => {
    if (!focusNameSignal) return
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
    lastCommitRef.current = Date.now()
    const clean = draft.trim()
    if (clean && clean !== name) onRename?.(clean)
  }

  return (
    <div className="scenario-bar">
      <div className="scenario-bar-left">
        <input
          ref={inputRef}
          className={`scenario-bar-name${editing ? ' editing' : ''}`}
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

        {editing ? (
          <button
            className="scenario-bar-btn"
            // preventDefault keeps focus, then blur commits via onBlur (single path)
            onMouseDown={e => { e.preventDefault(); inputRef.current?.blur() }}
            aria-label="Save scenario name"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        ) : (!switching && (
          <button
            className="scenario-bar-btn"
            onClick={() => { if (Date.now() - lastCommitRef.current > 350) onToggleSwitch() }}
            aria-label="Switch scenarios"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>
        ))}
      </div>

      <div className="scenario-bar-right">
        {switching ? (
          <button
            className="scenario-bar-btn scenario-bar-danger"
            onClick={onDelete}
            disabled={!canDelete}
            aria-label="Delete this scenario"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        ) : (
          <>
            <button
              className="scenario-bar-btn"
              onClick={onAdd}
              aria-label="Create a new scenario"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            {onSettings && (
              <button
                className="scenario-bar-btn"
                onClick={onSettings}
                aria-label="Settings"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
