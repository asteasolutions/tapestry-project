import { useState } from 'react'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { Snackbar } from 'tapestry-core-client/src/components/lib/snackbar/index'
import { ExportProgressBar } from '../../components/progress-bar/export-progress-bar'
import { ItemUploadProgressBar } from '../../components/progress-bar/item-upload-progress-bar'
import { backgroundTasks, useActiveExport } from '../../services/background-tasks'
import styles from './styles.module.css'

interface StatusIndicatorsProps {
  tapestryId: string
}

export function StatusIndicators({ tapestryId }: StatusIndicatorsProps) {
  const activeExport = useActiveExport(tapestryId)
  const [exportFailed, setExportFailed] = useState(false)

  useObservable(backgroundTasks, (_oldValue, { exports }, patches) => {
    const failed = patches.some(
      ({ path, value }) =>
        path[0] === 'exports' &&
        path.at(-1) === 'status' &&
        value === 'failed' &&
        exports[path[1] as number]?.tapestryId === tapestryId,
    )
    if (failed) {
      setExportFailed(true)
    }
  })

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
        value={exportFailed ? { content: 'Error during export', variant: 'error' } : undefined}
        onChange={() => setExportFailed(false)}
      />
    </>
  )
}
