import { ReactNode } from 'react'
import clsx from 'clsx'
import { Input, InputProps } from '../input'
import styles from './style.module.css'

interface InputWithAdornmentProps extends InputProps {
  endAdornment: ReactNode
}

export function InputWithAdornment({
  endAdornment,
  className,
  label,
  ...props
}: InputWithAdornmentProps) {
  const field = (
    <div className={styles.wrapper}>
      <Input className={clsx(styles.input, className)} {...props} />
      {endAdornment}
    </div>
  )

  return label ? (
    <label className={styles.label}>
      {label}
      {field}
    </label>
  ) : (
    field
  )
}
