import { useState, useRef, useEffect } from 'react'
import { SCENARIOS } from './PrototypeSettings'

const ImportIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)
const DesignIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
)
const KeyIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3-3.5 3.5" />
  </svg>
)
const ShieldIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const SignOutIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)
const TrashIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

// The signed-in user's name, pinned to the bottom of the scenario sidebar.
// Pressing it opens the settings popover above itself (left-aligned with
// the name) on every layout; flows chosen from it open in focused modals.
//
// `menu` — { scenario, onScenarioChange, importDisabled, onImport,
//   onOpenStickerSheet, onChangePassword, onShowRecovery, onSignOut,
//   onDeleteAccount }; absent callbacks hide their item.
export default function UserMenu({ name, tabIndex = 0, menu }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const initial = (name || '?').trim().charAt(0).toUpperCase()
  const trigger = (attrs) => (
    <button type="button" className="side-nav-user" tabIndex={tabIndex} {...attrs}>
      <span className="side-nav-user-avatar" aria-hidden="true">{initial}</span>
      <span className="side-nav-user-name">{name}</span>
    </button>
  )

  const pick = (fn) => () => { setOpen(false); fn?.() }
  const items = []
  if (menu.onImport) {
    items.push({
      label: 'Import data', icon: ImportIcon, onClick: menu.onImport,
      disabled: menu.importDisabled,
      title: menu.importDisabled ? 'Switch Mock data to None to import into your own data' : undefined,
    })
  }
  if (menu.onOpenStickerSheet) items.push({ label: 'Design System', icon: DesignIcon, onClick: menu.onOpenStickerSheet })
  if (menu.onChangePassword) items.push({ label: 'Change Password', icon: KeyIcon, onClick: menu.onChangePassword })
  if (menu.onShowRecovery) items.push({ label: 'Recovery Phrase', icon: ShieldIcon, onClick: menu.onShowRecovery })
  if (menu.onSignOut) items.push({ label: 'Sign Out', icon: SignOutIcon, onClick: menu.onSignOut })
  if (menu.onDeleteAccount) items.push({ label: 'Delete Account', icon: TrashIcon, onClick: menu.onDeleteAccount, danger: true })

  return (
    <div className="user-menu" ref={wrapRef}>
      {open && (
        <div className="popover-menu popover-menu--anchored" role="menu" aria-label="Settings">
          <div className="settings-pop-field">
            <label className="form-label" htmlFor="mock-data-select">Mock data</label>
            <div className="select-wrap">
              <select
                id="mock-data-select"
                className="select"
                value={menu.scenario}
                onChange={e => menu.onScenarioChange(e.target.value)}
              >
                {SCENARIOS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
          <div className="popover-divider" />
          {items.map(it => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              className={`popover-item${it.danger ? ' danger' : ''}`}
              disabled={it.disabled}
              title={it.title}
              onClick={pick(it.onClick)}
            >
              <span className="popover-item-icon">{it.icon}</span>
              {it.label}
            </button>
          ))}
        </div>
      )}
      {trigger({ onClick: () => setOpen(o => !o), 'aria-haspopup': 'menu', 'aria-expanded': open })}
    </div>
  )
}
