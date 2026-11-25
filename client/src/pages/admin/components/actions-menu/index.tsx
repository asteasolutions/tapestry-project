import { KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import clsx from 'clsx'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import styles from './styles.module.css'

export interface ActionsMenuItem {
  key: string
  label: string
  /** Shown under the label, e.g. why the action is unavailable */
  hint?: string
  /** An in-app link */
  to?: string
  onSelect?: () => unknown
  disabled?: boolean
  danger?: boolean
  /** Draws a divider above the item */
  separated?: boolean
}

interface Position {
  top: number
  right: number
}

const GAP = 4

/** A "more actions" button with a menu. The menu is portalled so scrolling tables don't clip it. */
export function ActionsMenu({ label, items }: { label: string; items: ActionsMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = (restoreFocus = true) => {
    setOpen(false)
    setPosition(null)
    if (restoreFocus) {
      buttonRef.current?.focus()
    }
  }

  // Place the menu below the button, or above it if there is no room below
  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !menuRef.current) {
      return
    }
    const anchor = buttonRef.current.getBoundingClientRect()
    const height = menuRef.current.offsetHeight
    const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight
    setPosition({
      top: fitsBelow ? anchor.bottom + GAP : Math.max(GAP, anchor.top - GAP - height),
      right: window.innerWidth - anchor.right,
    })
  }, [open])

  // Focus the first available item once the menu is visible
  const placed = !!position
  useEffect(() => {
    if (!placed) {
      return
    }
    menuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
      ?.focus()
  }, [placed])

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        close(false)
      }
    }

    const onViewportChange = () => close(false)

    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [open])

  function onKeyDown(event: KeyboardEvent) {
    const menuItems = [
      ...(menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ) ?? []),
    ]
    const index = menuItems.indexOf(document.activeElement as HTMLElement)
    const focus = (i: number) => menuItems.at(i % menuItems.length)?.focus()

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'Tab':
        close(false)
        break
      case 'ArrowDown':
        event.preventDefault()
        focus(index + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focus(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focus(0)
        break
      case 'End':
        event.preventDefault()
        focus(-1)
        break
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={clsx(styles.trigger, { [styles.open]: open })}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Icon icon="more_vert" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            className={styles.menu}
            style={position ?? { visibility: 'hidden', top: 0, right: 0 }}
            onKeyDown={onKeyDown}
          >
            {items.map((item) => {
              const className = clsx(styles.item, {
                [styles.danger]: item.danger,
                [styles.separated]: item.separated,
              })
              const content = (
                <>
                  <span>{item.label}</span>
                  {item.hint && <span className={styles.hint}>{item.hint}</span>}
                </>
              )
              if (item.to && !item.disabled) {
                return (
                  <Link
                    key={item.key}
                    role="menuitem"
                    tabIndex={-1}
                    className={className}
                    to={item.to}
                    onClick={() => close(false)}
                  >
                    {content}
                  </Link>
                )
              }
              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={className}
                  aria-disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return
                    close(false)
                    item.onSelect?.()
                  }}
                >
                  {content}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
