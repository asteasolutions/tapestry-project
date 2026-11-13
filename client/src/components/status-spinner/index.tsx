import clsx from 'clsx'
import styles from './styles.module.css'

interface StatusSpinnerProps {
  className?: string
}

export function StatusSpinner({ className }: StatusSpinnerProps) {
  return <span className={clsx(styles.root, className)} aria-hidden />
}
