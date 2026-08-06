// Floating top nav, modern style: a circular menu button (top left) that opens
// the side nav, and the active scenario name beside it (with a Synced/Unsynced
// badge once there's more than one scenario). No surface of its own — the
// button floats over the page content. Renaming lives in the side nav's
// per-scenario action menu, and settings live in the side nav's user menu.
// `synced` is tri-state: true/false renders the badge, undefined hides it
// (single scenario — sync isn't meaningful yet).
export default function TopNav({ name, synced, onMenu, onAsk }) {
  return (
    <div className="top-nav">
      <div className="top-nav-left">
        <button className="fab top-nav-menu-btn" onClick={onMenu} aria-label="Open scenarios menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="top-nav-name">{name}</span>
        {synced !== undefined && (
          <span className={`badge ${synced ? 'badge-synced' : 'badge-unsynced'}`}>
            {synced ? 'Synced' : 'Unsynced'}
          </span>
        )}
      </div>
      {onAsk && (
        <button className="top-nav-ask" onClick={onAsk} aria-label="Ask Worthfolio">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3z" />
            <path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
          </svg>
          <span>Ask</span>
        </button>
      )}
    </div>
  )
}
