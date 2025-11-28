import clsx from 'clsx'
import styles from './styles.module.css'

interface LoadingIndicatorProps {
  className?: string
}

export function LoadingIndicator({ className }: LoadingIndicatorProps) {
  return <div className={clsx(className, styles.root)} />
}
