import { IconButton, MenuItemButton } from '../buttons/index'

export interface InfoButtonProps {
  active: boolean
  onClick: () => unknown
  variant: 'icon' | 'menu'
  menuClass?: string
}

export function InfoButton({ active, onClick, variant, menuClass }: InfoButtonProps) {
  return (
    <>
      {variant === 'icon' ? (
        <IconButton icon="info" aria-label="Info" onClick={onClick} isActive={active} />
      ) : (
        <MenuItemButton
          shortcut="meta + I"
          onClick={onClick}
          className={menuClass}
          isActive={active}
        >
          Info
        </MenuItemButton>
      )}
    </>
  )
}
