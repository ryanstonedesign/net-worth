import { useEffect, useState } from 'react'
import Popover from './Popover'
import Modal from './Modal'
import SyncIcon from './SyncIcon'
import UserMenu from './UserMenu'
import BrandLockup from './BrandLockup'

const RenameIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
)
const DeleteIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)
const SyncActionIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)

const HomeIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </svg>
)
const ScenariosIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 17l5-5 4 4 8-9" />
    <path d="M3 21h18" />
  </svg>
)
const BackIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

// Two-level navigation.
//
// The rail is the top level: logo, Home, Scenarios, and the account row at
// the bottom. The panel beside it lists the scenarios.
//
// Desktop: Home shows the full rail. Choosing Scenarios collapses the rail to
// icons (logo kept, wordmark hidden, labels as hover tooltips) and slides the
// scenario panel in beside it; choosing Home again closes the panel.
//
// Mobile: the drawer starts on the rail (or on the scenario list, if a
// scenario is open). Scenarios slides the list in over the rail with a back
// button; Home goes home and closes the drawer.
//
// Side navigation that lists every scenario; tap one to switch to it. The
// "New scenario" row under the title creates one. Each row carries a 3-dot
// action menu (rename / sync / delete); unsynced scenarios show a small sync
// glyph in their leading slot. On mobile it's a drawer behind the page
// content; on desktop (`desktop`) it's a fixed, always-visible sidebar. The
// signed-in user's name is pinned to the bottom and opens the settings
// popover (via `settingsMenu`) on every layout.
export default function SideNav({
  open, desktop, view = 'scenario', onHome, onScenarios,
  scenarios, activeId, onSelect, onAdd, onDelete, onRename, onToggleSync,
  userName, userAvatar, settingsMenu,
}) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  // Scenario whose sync state is pending the confirm dialog, or null.
  const [confirmSync, setConfirmSync] = useState(null)
  // Mobile drawer level: 'root' (Home / Scenarios) or 'scenarios' (the list).
  // Each time the drawer opens it starts where the user is.
  const [level, setLevel] = useState(view === 'home' ? 'root' : 'scenarios')
  useEffect(() => {
    if (open) setLevel(view === 'home' ? 'root' : 'scenarios')
  }, [open, view])

  const tabbable = open || desktop
  // Desktop opens the panel whenever a scenario is showing; the drawer only
  // once the user steps into the list.
  const panelOpen = desktop ? view !== 'home' : level === 'scenarios'
  const railTabbable = tabbable && (desktop || !panelOpen)
  const panelTabbable = tabbable && panelOpen

  const chooseScenarios = () => {
    if (desktop) onScenarios?.()
    else setLevel('scenarios')
  }

  const startRename = (s) => { setEditingId(s.id); setDraft(s.name) }
  const commitRename = () => {
    const clean = draft.trim()
    const current = scenarios.find(s => s.id === editingId)
    if (clean && current && clean !== current.name) onRename(editingId, clean)
    setEditingId(null)
  }

  return (
    <aside
      className={`side-nav${open ? ' open' : ''}${panelOpen ? ' side-nav--panel' : ''}`}
      aria-hidden={desktop ? undefined : !open}
    >
      <div className="side-nav-rail" aria-hidden={!desktop && panelOpen ? true : undefined}>
        <div className="side-nav-header">
          <BrandLockup compact className="side-nav-title" />
        </div>
        <nav className="side-nav-primary" aria-label="Main">
          <button
            type="button"
            className={`side-nav-link${view === 'home' ? ' active' : ''}`}
            aria-current={view === 'home' ? 'page' : undefined}
            onClick={onHome}
            aria-label="Home"
            tabIndex={railTabbable ? 0 : -1}
          >
            <span className="side-nav-link-icon">{HomeIcon}</span>
            <span className="side-nav-link-label">Home</span>
            <span className="side-nav-tip" aria-hidden="true">Home</span>
          </button>
          <button
            type="button"
            className={`side-nav-link${view !== 'home' ? ' active' : ''}`}
            aria-current={view !== 'home' ? 'page' : undefined}
            aria-expanded={panelOpen}
            onClick={chooseScenarios}
            aria-label="Scenarios"
            tabIndex={railTabbable ? 0 : -1}
          >
            <span className="side-nav-link-icon">{ScenariosIcon}</span>
            <span className="side-nav-link-label">Scenarios</span>
            {!desktop && (
              <svg className="side-nav-link-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            <span className="side-nav-tip" aria-hidden="true">Scenarios</span>
          </button>
        </nav>
        <div className="side-nav-footer">
          <UserMenu
            name={userName}
            avatar={userAvatar}
            tabIndex={railTabbable ? 0 : -1}
            menu={settingsMenu}
          />
        </div>
      </div>

      <div className="side-nav-panel" aria-hidden={!panelOpen ? true : undefined} aria-label="Scenarios">
        <div className="side-nav-panel-head">
          {!desktop && (
            <button
              type="button"
              className="btn-icon side-nav-back"
              onClick={() => setLevel('root')}
              aria-label="Back"
              tabIndex={panelTabbable ? 0 : -1}
            >
              {BackIcon}
            </button>
          )}
          <span className="side-nav-panel-title">Scenarios</span>
        </div>
        <button className="side-nav-new" onClick={onAdd} tabIndex={panelTabbable ? 0 : -1}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New scenario
        </button>
        <nav className="side-nav-list">
          {scenarios.map(s => {
            const isEditing = editingId === s.id
            const items = [{ label: 'Rename', icon: RenameIcon, onClick: () => startRename(s) }]
            items.push({
              label: s.linked ? 'Unsync' : 'Sync',
              icon: SyncActionIcon,
              onClick: () => setConfirmSync(s),
            })
            if (scenarios.length > 1) {
              items.push({ label: 'Delete', icon: DeleteIcon, onClick: () => onDelete(s.id), danger: true })
            }
            return (
              <div
                key={s.id}
                className={`side-nav-item${s.id === activeId ? ' active' : ''}${isEditing ? ' editing' : ''}`}
              >
                {isEditing ? (
                  <input
                    className="side-nav-item-input"
                    value={draft}
                    maxLength={40}
                    autoFocus
                    aria-label="Scenario name"
                    onFocus={e => e.target.select()}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                ) : (
                  <button className="side-nav-item-name" onClick={() => onSelect(s.id)} tabIndex={panelTabbable ? 0 : -1}>
                    {/* Fixed leading slot keeps names left-aligned with the
                        "New scenario" label; it carries the unsynced glyph
                        when applicable (synced is the norm — only flag the
                        exception). */}
                    <span className="side-nav-item-lead">
                      {scenarios.length > 1 && !s.linked && <SyncIcon className="sync-badge sync-badge--off" />}
                    </span>
                    <span className="side-nav-item-label">{s.name}</span>
                  </button>
                )}
                {!isEditing && (
                  <Popover
                    ariaLabel={`Actions for ${s.name}`}
                    triggerClassName="side-nav-item-menu"
                    tabIndex={panelTabbable ? 0 : -1}
                    items={items}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="5" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                    </svg>
                  </Popover>
                )}
              </div>
            )
          })}
        </nav>

      </div>

      {confirmSync && (
        <Modal
          title={confirmSync.linked ? 'Unsync this scenario?' : 'Sync this scenario?'}
          onClose={() => setConfirmSync(null)}
        >
          <p className="sync-explain" style={{ margin: '0 0 24px', fontSize: 14 }}>
            {confirmSync.linked ? (
              <>
                “{confirmSync.name}” will stop receiving your monthly updates.
                Balances and contributions you save from now on won't copy
                into it, and edits you make inside it stay there. Everything
                it holds today is kept as-is.
              </>
            ) : (
              <>
                “{confirmSync.name}” will start receiving your monthly updates
                again. Its current and past months will be replaced right now
                with your latest saved balances and contributions. Its growth
                rates and future plans won't change.
              </>
            )}
          </p>
          <div className="confirm-actions">
            <button className="btn btn-secondary" onClick={() => setConfirmSync(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { onToggleSync(confirmSync.id, !confirmSync.linked); setConfirmSync(null) }}
            >
              Continue
            </button>
          </div>
        </Modal>
      )}
    </aside>
  )
}
