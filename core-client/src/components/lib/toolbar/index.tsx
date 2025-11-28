import clsx from 'clsx'
import styles from './styles.module.css'
import { CSSProperties, ReactElement, Ref } from 'react'
import { Tooltip, TooltipProps } from '../tooltip/index.js'
import { compact } from 'lodash-es'
import { useOutsideClick } from '../../lib/hooks/use-outside-click.js'
import { Prev } from 'tapestry-core/src/type-utils'

type Direction = 'row' | 'column'
type Separator = 'separator'

export type SubmenuIds<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends readonly unknown[]
    ? SubmenuIds<T[number], D>
    : T extends { id: infer I extends string; submenu: infer M extends readonly unknown[] }
      ? `${I}${'' | `.${SubmenuIds<M[number], Prev[D]>}`}`
      : never

export interface ToolbarElement {
  element: ReactElement
  tooltip?: TooltipProps
  stretch?: boolean
}

export type SimpleMenuItem = ReactElement | ToolbarElement | Separator
export interface MenuItemWithSubmenu {
  id: string
  ui: ReactElement | ToolbarElement
  submenu: MenuItems
  direction?: Direction
}
export type MenuItem = SimpleMenuItem | MenuItemWithSubmenu
export type MaybeMenuItem = MenuItem | null | undefined | false
export type MenuItems = MaybeMenuItem[] | MaybeMenuItem[][]

function hasSubmenu(item: MenuItem): item is MenuItemWithSubmenu {
  return (
    Object.prototype.hasOwnProperty.call(item, 'ui') &&
    Object.prototype.hasOwnProperty.call(item, 'submenu')
  )
}

export function isMultiLineMenu(items: MenuItems): items is MaybeMenuItem[][] {
  return Array.isArray(items[0])
}

export interface ToolbarProps {
  isOpen?: boolean
  items: MenuItems
  selectedSubmenu?: string | string[]
  className?: string
  direction?: Direction
  style?: CSSProperties
  onFocusOut?: (source: HTMLElement, target: HTMLElement) => void
  wrapperRef?: Ref<HTMLDivElement | null>
}

export interface ToolbarRowProps {
  items: MaybeMenuItem[]
  selectedSubmenu?: string[]
}

function isToolbarElement(elem: ReactElement | ToolbarElement): elem is ToolbarElement {
  return !!(elem as ToolbarElement).element
}

function SimpleMenuItem({ ui }: { ui: SimpleMenuItem }) {
  if (ui === 'separator') {
    return <div className="separator" />
  }

  const { element, tooltip, stretch } = isToolbarElement(ui) ? ui : { element: ui }

  return (
    <div className={clsx('menu-item-wrapper', { [styles.stretch]: stretch })}>
      {element}
      {tooltip && <Tooltip {...tooltip} offset={16 + (tooltip.offset ?? 0)} />}
    </div>
  )
}

function ToolbarRow({ items, selectedSubmenu }: ToolbarRowProps) {
  const [openSubmenu, ...openNestedSubmenus] = selectedSubmenu ?? []

  return (
    <div className="toolbar-row">
      {compact(items).map((item, index) =>
        hasSubmenu(item) ? (
          <div className={clsx('submenu-item', item.id)} key={index}>
            <SimpleMenuItem ui={item.ui} />
            <Toolbar
              isOpen={item.id === openSubmenu}
              items={item.submenu}
              className="submenu"
              direction={item.direction}
              selectedSubmenu={openNestedSubmenus}
            />
          </div>
        ) : (
          <SimpleMenuItem key={index} ui={item} />
        ),
      )}
    </div>
  )
}

export function Toolbar({
  isOpen,
  items,
  className,
  direction = 'row',
  selectedSubmenu,
  style,
  onFocusOut,
  wrapperRef,
}: ToolbarProps) {
  const ref = useOutsideClick<HTMLDivElement>(onFocusOut)

  if (!isOpen) {
    return null
  }
  const openSubmenu =
    typeof selectedSubmenu === 'string' ? selectedSubmenu.split('.') : selectedSubmenu

  return (
    <div className={clsx(styles.root, className)} style={style} ref={ref}>
      <div
        className={clsx(styles.wrapper, { [styles.column]: direction === 'column' }, 'wrapper')}
        data-captures-pointer-events
        ref={wrapperRef}
      >
        {isMultiLineMenu(items) ? (
          items.map((row, index) => (
            <ToolbarRow key={index} items={row} selectedSubmenu={openSubmenu} />
          ))
        ) : (
          <ToolbarRow items={items} selectedSubmenu={openSubmenu} />
        )}
      </div>
    </div>
  )
}
