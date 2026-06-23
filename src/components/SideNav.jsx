import { useState } from 'react'
import Popover from './Popover'

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

// Side navigation drawer that sits behind the page content. Lists every
// scenario; tap one to switch to it. The "+" in the header creates a new
// scenario. Each row carries a 3-dot action menu (rename / delete).
export default function SideNav({ open, scenarios, activeId, onSelect, onAdd, onDelete, onRename }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')

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
        <span className="side-nav-title">Scenarios</span>
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
                  {s.name}
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
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </Popover>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
