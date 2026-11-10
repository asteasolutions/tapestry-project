import { ReactNode } from 'react'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { StatusSpinner } from '../../status-spinner'
import styles from './styles.module.css'

export type RowStatus = 'inProgress' | 'complete' | 'failed' | 'cancelled'

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === 'inProgress') {
    return <StatusSpinner />
  }
  if (status === 'complete') {
    return <Icon icon="check_circle" className={styles.complete} aria-label="Done" />
  }
  return (
    <Icon
      icon={status === 'cancelled' ? 'cancel' : 'error'}
      className={styles.failed}
      aria-label={status === 'cancelled' ? 'Cancelled' : 'Failed'}
    />
  )
}

interface RowProps {
  icon: IconName
  name: string
  status: RowStatus
  percent?: number
  children?: ReactNode
}

export function Row({ icon, name, status, percent, children }: RowProps) {
  return (
    <div className={styles.root}>
      <Icon icon={icon} className={styles.fileIcon} />
      <Text variant="bodySm" className={styles.name} title={name}>
        {name}
      </Text>
      {percent !== undefined && (
        <Text variant="bodySm" className={styles.percent}>
          {Math.round(percent)}%
        </Text>
      )}
      {children}
      <StatusIcon status={status} />
    </div>
  )
}
