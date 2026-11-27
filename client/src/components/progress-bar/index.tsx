import { Button, IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { TooltipProps } from 'tapestry-core-client/src/components/lib/tooltip/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { StatusSpinner } from '../status-spinner'
import styles from './styles.module.css'

export interface ProgressBarProps {
  label: string
  percent?: number
  onCancel?: () => unknown
  onDismiss?: () => unknown
  dismissLabel?: string
  dismissTooltip?: TooltipProps['children']
}

export function ProgressBar({
  label,
  percent,
  onCancel,
  onDismiss,
  dismissLabel = 'Hide progress',
  dismissTooltip,
}: ProgressBarProps) {
  return (
    <div className={styles.root} role="status">
      <StatusSpinner />
      <Text variant="bodySm" className={styles.label}>
        {label}
        {percent !== undefined && ` ${Math.round(percent)}%`}
      </Text>
      {onCancel && (
        <Button variant="outline" size="small" className={styles.cancel} onClick={onCancel}>
          Cancel
        </Button>
      )}
      {onDismiss && (
        <IconButton
          icon="close"
          aria-label={dismissLabel}
          size="small"
          className={styles.close}
          onClick={onDismiss}
          tooltip={dismissTooltip ? { side: 'top', children: dismissTooltip } : undefined}
        />
      )}
    </div>
  )
}
