import styles from './styles.module.css'
import clsx from 'clsx'

interface ToggleUIProps {
  isChecked: boolean
  disabled?: boolean
  className?: string
}

export function ToggleUI({ isChecked, className, disabled }: ToggleUIProps) {
  return (
    <div
      className={clsx(styles.container, className, {
        checked: isChecked,
        [styles.disabled]: disabled,
      })}
    />
  )
}
