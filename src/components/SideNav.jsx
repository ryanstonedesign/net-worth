// Side navigation drawer that sits behind the page content. The shell slides
// aside to reveal it (see .app-shell.nav-open). It lists every scenario; tap one
// to switch to it. The "+" in the header creates a new scenario, and each row
// past the first carries a delete control.
export default function SideNav({ open, scenarios, activeId, onSelect, onAdd, onDelete }) {
  return (
    <aside className={`side-nav${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="side-nav-header">
        <span className="side-nav-title">Scenarios</span>
        <button className="fab fab-sm" onClick={onAdd} aria-label="Create a new scenario">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <nav className="side-nav-list">
        {scenarios.map(s => (
          <div
            key={s.id}
            className={`side-nav-item${s.id === activeId ? ' active' : ''}`}
          >
            <button
              className="side-nav-item-name"
              onClick={() => onSelect(s.id)}
            >
              {s.name}
            </button>
            {scenarios.length > 1 && (
              <button
                className="side-nav-item-del"
                onClick={() => onDelete(s.id)}
                aria-label={`Delete ${s.name}`}
                tabIndex={open ? 0 : -1}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
