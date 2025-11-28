import clsx from 'clsx'
import styles from './styles.module.css'
import { ToggleUI } from './ui/index.js'
import { ReactNode } from 'react'

interface ToggleProps {
  label?: ReactNode
  onChange: () => unknown
  isChecked: boolean
  className?: string
  disabled?: boolean
}

export function Toggle({ label, onChange, isChecked, className, disabled }: ToggleProps) {
  return (
    <label className={clsx(styles.root, className, { [styles.disabled]: disabled })}>
      {label}
      <ToggleUI isChecked={isChecked} disabled={disabled}></ToggleUI>
      <input type="checkbox" checked={isChecked} onChange={onChange} disabled={disabled} />
    </label>
  )
}
