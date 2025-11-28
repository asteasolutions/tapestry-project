import { ProgressEvent } from '../../../services/tapestry-exporter'
import { LoadingSpinner } from 'tapestry-core-client/src/components/lib/loading-spinner/index'
import styles from './styles.module.css'

function dashArray(progress: number, radius: number) {
  const circumference = radius * Math.PI * 2
  const filled = progress * circumference
  return `${filled} ${circumference - filled}`
}

interface ExportProgressIndicatorProps {
  progress: ProgressEvent
  radius?: number
}

const PADDING = 1

export function ExportProgressIndicator({ progress, radius = 9 }: ExportProgressIndicatorProps) {
  const center = radius + PADDING
  const size = center * 2

  const downloadRadius = radius - 3

  return progress === 'pending' ? (
    <LoadingSpinner size={`${radius * 2}px`} />
  ) : (
    <svg width={size} height={size}>
      <circle
        cx={center}
        cy={center}
        r={downloadRadius}
        className={styles.circle}
        style={{
          stroke: 'var(--theme-background-brand-secondary)',
          strokeDasharray: dashArray(progress.download, downloadRadius),
        }}
      />
      {progress.download === 1 && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          className={styles.circle}
          style={{
            stroke: 'var(--theme-text-positive)',
            strokeDasharray: dashArray(progress.compression, radius),
          }}
        />
      )}
    </svg>
  )
}
