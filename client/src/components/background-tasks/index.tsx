import { noop } from 'lodash-es'
import { useEffect, useState } from 'react'
import { Snackbar } from 'tapestry-core-client/src/components/lib/snackbar/index'
import { useTapestryExport } from '../../hooks/use-tapestry-export'
import { useTapestryImport } from '../../hooks/use-tapestry-import'
import { backgroundTasks } from '../../services/background-tasks'

export function BackgroundTasks() {
  const [exportError, setExportError] = useState(false)

  const { exports, triggerExport, cancelExport, clearFinished } = useTapestryExport({
    onError: () => setExportError(true),
  })
  const { imports, importTapestries, reset } = useTapestryImport(noop)

  useEffect(() => {
    backgroundTasks.connect(
      { imports: imports ?? [], exports },
      {
        triggerExport,
        cancelExport,
        clearFinishedExports: clearFinished,
        importTapestries,
        resetImports: reset,
      },
    )
  })

  return (
    <Snackbar
      value={exportError ? { text: 'Error during export', variant: 'error' } : undefined}
      onChange={() => setExportError(false)}
    />
  )
}
