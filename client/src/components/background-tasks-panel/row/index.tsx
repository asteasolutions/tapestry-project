import { ReactNode } from 'react'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { StatusSpinner } from '../../status-spinner'
import styles from './styles.module.css'

export type RowStatus = 'inProgress' | 'complete' | 'failed' | 'cancelled'

const STATUS_ICONS: Record<RowStatus, ReactNode> = {
  inProgress: <StatusSpinner />,
  complete: <Icon icon="check_circle" className={styles.complete} aria-label="Done" />,
  failed: <Icon icon="error" className={styles.failed} aria-label="Failed" />,
  cancelled: <Icon icon="cancel" className={styles.cancelled} aria-label="Cancelled" />,
}

interface RowProps {
  icon: IconName
  name: string
  status: RowStatus
  percent?: number
  message?: string
  children?: ReactNode
}

export function Row({ icon, name, status, percent, message, children }: RowProps) {
  return (
    <div className={styles.root}>
      <Icon icon={icon} className={styles.fileIcon} />
      <div className={styles.text}>
        <Text variant="bodySm" className={styles.name} title={name}>
          {name}
        </Text>
        {message && (
          <Text variant="bodyXs" className={status === 'failed' ? styles.failed : styles.cancelled}>
            {message}
          </Text>
        )}
      </div>
      {percent !== undefined && (
        <Text variant="bodySm" className={styles.percent}>
          {Math.round(percent)}%
        </Text>
      )}
      {children}
      {STATUS_ICONS[status]}
    </div>
  )
}
