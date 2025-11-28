import clsx from 'clsx'
import { Button, ButtonComponent, ButtonProps } from './button.js'
import styles from './icon-button-styles.module.css'

export type IconButtonProps<T extends ButtonComponent = 'button'> = Omit<
  ButtonProps<T>,
  'icon' | 'variant' | 'aria-label'
> & {
  icon: NonNullable<ButtonProps['icon']>
  'aria-label': string
}

export function IconButton<T extends ButtonComponent = 'button'>({
  icon,
  className,
  ...buttonProps
}: IconButtonProps<T>) {
  return (
    <Button<ButtonComponent>
      icon={icon}
      variant="tertiary"
      className={clsx(styles.iconButton, className)}
      {...buttonProps}
    />
  )
}
