import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { ExportProgressBar } from '../../components/progress-bar/export-progress-bar'
import { ItemUploadProgressBar } from '../../components/progress-bar/item-upload-progress-bar'
import { backgroundTasks } from '../../services/background-tasks'
import styles from './styles.module.css'

interface StatusIndicatorsProps {
  tapestryId: string
}

export function StatusIndicators({ tapestryId }: StatusIndicatorsProps) {
  useObservable(backgroundTasks)
  const activeExport = backgroundTasks.getActiveExport(tapestryId)

  return (
    <div className={styles.statusIndicators}>
      <ItemUploadProgressBar />
      {activeExport && (
        <ExportProgressBar
          key={activeExport.id}
          progress={activeExport.progress}
          onCancel={() => backgroundTasks.cancelExport(activeExport.id)}
        />
      )}
    </div>
  )
}
