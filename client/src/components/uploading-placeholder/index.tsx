import clsx from 'clsx'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { StatusSpinner } from '../status-spinner'
import styles from './styles.module.css'

interface UploadingPlaceholderProps {
  className?: string
}

export function UploadingPlaceholder({ className }: UploadingPlaceholderProps) {
  return (
    <div className={clsx(styles.root, className)} role="status">
      <Text variant="bodySm" className={styles.label}>
        <StatusSpinner />
        Uploading
      </Text>
    </div>
  )
}
