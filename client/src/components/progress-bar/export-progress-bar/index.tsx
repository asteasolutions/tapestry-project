import { useState } from 'react'
import { ProgressEvent } from '../../../services/tapestry-exporter'
import { ProgressBar } from '..'

export function exportPercent(progress: ProgressEvent) {
  if (progress === 'pending') {
    return undefined
  }
  return Math.min(100, Math.floor((progress.download * 0.8 + progress.compression * 0.2) * 100))
}

interface ExportProgressBarProps {
  progress: ProgressEvent
  onCancel: () => unknown
}

export function ExportProgressBar({ progress, onCancel }: ExportProgressBarProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return null
  }

  const percent = exportPercent(progress)

  return (
    <ProgressBar
      label={percent === undefined ? 'Preparing export…' : 'Exporting file'}
      percent={percent}
      onCancel={onCancel}
      onDismiss={() => setDismissed(true)}
      dismissLabel="Hide"
      dismissTooltip="Hide (export continues)"
    />
  )
}
