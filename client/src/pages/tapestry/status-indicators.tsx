import { useState } from 'react'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { Snackbar } from 'tapestry-core-client/src/components/lib/snackbar/index'
import { ExportProgressBar } from '../../components/progress-bar/export-progress-bar'
import { ItemUploadProgressBar } from '../../components/progress-bar/item-upload-progress-bar'
import { backgroundTasks, findActiveExport } from '../../services/background-tasks'
import styles from './styles.module.css'

interface StatusIndicatorsProps {
  tapestryId: string
}

export function StatusIndicators({ tapestryId }: StatusIndicatorsProps) {
  const { exports } = useObservable(backgroundTasks)
  const activeExport = findActiveExport(exports, tapestryId)

  const [shownExportId, setShownExportId] = useState<string>()
  const [exportFailed, setExportFailed] = useState(false)
  if (activeExport && activeExport.id !== shownExportId) {
    setShownExportId(activeExport.id)
  }
  const shownExport = exports.find((e) => e.id === shownExportId)
  if (shownExportId && shownExport?.status !== 'exporting') {
    setShownExportId(undefined)
    setExportFailed(shownExport?.status === 'failed')
  }

  return (
    <>
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
      <Snackbar
        value={exportFailed ? { text: 'Error during export', variant: 'error' } : undefined}
        onChange={() => setExportFailed(false)}
      />
    </>
  )
}
