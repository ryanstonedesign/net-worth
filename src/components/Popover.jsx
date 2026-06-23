import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'

// System popover menu: a trigger button that opens a floating action menu
// anchored to it. Closes on outside click or Escape. The menu is portaled to
// the body so it's never clipped by scroll containers or stacking contexts.
//
// Props:
//   children        – the trigger's contents (an icon)
//   items           – [{ label, icon?, onClick, danger? }]
//   ariaLabel       – accessible label for the trigger
//   triggerClassName – extra class for the trigger button
//   tabIndex        – trigger tab index (default 0)
export default function Popover({ children, items, ariaLabel, triggerClassName = '', tabIndex = 0 }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  // Position the menu under the trigger, right-aligned. Flip above if it would
  // run off the bottom of the viewport. Runs after the menu has mounted, so its
  // height is measurable.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const t = triggerRef.current?.getBoundingClientRect()
    if (!t) return
    const h = menuRef.current?.offsetHeight || 0
    const below = t.bottom + 6
    const flip = below + h > window.innerHeight - 8 && t.top - 6 - h > 8
    setPos({ top: flip ? t.top - 6 - h : below, right: window.innerWidth - t.right })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`popover-trigger ${triggerClassName}`.trim()}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        tabIndex={tabIndex}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
      >
        {children}
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="popover-menu"
          role="menu"
          // Off-screen on the first measuring pass, then placed by the effect.
          style={pos ? { top: pos.top, right: pos.right } : { top: -9999, left: -9999 }}
        >
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={`popover-item${it.danger ? ' danger' : ''}`}
              onClick={() => { setOpen(false); it.onClick?.() }}
            >
              {it.icon && <span className="popover-item-icon">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
