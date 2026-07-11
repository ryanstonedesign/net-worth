import { useState } from 'react'
import Popover from './Popover'
import Modal from './Modal'
import SyncIcon from './SyncIcon'

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

// Side navigation drawer that sits behind the page content. Lists every
// scenario; tap one to switch to it. The "+" in the header creates a new
// scenario. Each row carries a 3-dot action menu (rename / sync / delete);
// synced scenarios show a small sync glyph beside their name.
export default function SideNav({ open, scenarios, activeId, onSelect, onAdd, onDelete, onRename, onToggleSync }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  // Scenario whose sync state is pending the confirm dialog, or null.
  const [confirmSync, setConfirmSync] = useState(null)

  const startRename = (s) => { setEditingId(s.id); setDraft(s.name) }
  const commitRename = () => {
    const clean = draft.trim()
    const current = scenarios.find(s => s.id === editingId)
    if (clean && current && clean !== current.name) onRename(editingId, clean)
    setEditingId(null)
  }

  return (
    <aside className={`side-nav${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="side-nav-header">
        <span className="side-nav-title">Worthfolio</span>
        <button className="fab fab-sm" onClick={onAdd} aria-label="Create a new scenario">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

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
                <button className="side-nav-item-name" onClick={() => onSelect(s.id)}>
                  <span className="side-nav-item-label">{s.name}</span>
                  {/* Synced is the norm — only flag the exception. */}
                  {scenarios.length > 1 && !s.linked && <SyncIcon className="sync-badge sync-badge--off" />}
                </button>
              )}
              {!isEditing && (
                <Popover
                  ariaLabel={`Actions for ${s.name}`}
                  triggerClassName="side-nav-item-menu"
                  tabIndex={open ? 0 : -1}
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
