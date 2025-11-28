import { ToggleUI } from '../toggle/ui/index.js'
import { MenuItemButton, MenuItemButtonProps } from './menu-item-button.js'

export type MenuItemToggleProps = Omit<
  MenuItemButtonProps,
  'component' | 'shortcut' | 'hasSubmenu'
> & {
  isChecked: boolean
}

export function MenuItemToggle({
  isChecked,
  children,
  className,
  ...buttonProps
}: MenuItemToggleProps) {
  return (
    <MenuItemButton className={className} {...buttonProps}>
      {children}
      <span style={{ flexGrow: 1 }} />
      <ToggleUI isChecked={isChecked} />
    </MenuItemButton>
  )
}
