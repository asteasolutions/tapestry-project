import clsx from 'clsx'
import styles from './styles.module.css'
import { CSSProperties } from 'react'

interface UploadIndicatorProps {
  progress?: number
  className?: string
}

export function UploadIndicator({ progress, className }: UploadIndicatorProps) {
  return (
    <div
      className={clsx(styles.root, className)}
      style={{ '--upload-progress': `${(progress ?? 0) * 100}%` } as CSSProperties}
    />
  )
}
