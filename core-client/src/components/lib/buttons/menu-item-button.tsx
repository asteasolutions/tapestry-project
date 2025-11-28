import clsx from 'clsx'
import { shortcutLabel } from '../../../lib/keyboard-event.js'
import { Text } from '../text/index.js'
import { Button, ButtonComponent, ButtonProps } from './button.js'
import styles from './menu-item-button-styles.module.css'
import { Icon } from '../icon/index.js'

export type MenuItemButtonProps<T extends ButtonComponent = 'button'> = Omit<
  ButtonProps<T>,
  'variant'
> & {
  hasSubmenu?: boolean
  shortcut?: string
  variant?: 'default' | 'negative'
}

export function MenuItemButton<T extends ButtonComponent = 'button'>({
  hasSubmenu,
  children,
  shortcut,
  className,
  variant = 'default',
  ...buttonProps
}: MenuItemButtonProps<T>) {
  return (
    <Button<ButtonComponent>
      variant={variant === 'negative' ? 'tertiary-negative' : 'tertiary'}
      className={clsx('menu-item-button', className)}
      {...buttonProps}
    >
      {children}
      {shortcut && (
        <Text component="div" variant="bodySm" className={styles.shortcutLabel}>
          {shortcutLabel(shortcut)}
        </Text>
      )}
      {hasSubmenu && (
        <>
          <span style={{ flexGrow: 1 }} />
          <Icon icon="chevron_right" />
        </>
      )}
    </Button>
  )
}
