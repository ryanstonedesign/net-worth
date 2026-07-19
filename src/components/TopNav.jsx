// Floating top nav, modern style: a circular menu button (top left) that opens
// the side nav, and the active scenario name beside it (with a Synced/Unsynced
// badge once there's more than one scenario). No surface of its own — the
// button floats over the page content. Renaming lives in the side nav's
// per-scenario action menu, and settings live in the side nav's user menu.
// `synced` is tri-state: true/false renders the badge, undefined hides it
// (single scenario — sync isn't meaningful yet).
export default function TopNav({ name, synced, onMenu }) {
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
    </div>
  )
}
