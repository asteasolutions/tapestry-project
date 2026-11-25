import { useState } from 'react'
import { noop } from 'lodash-es'
import { ZodError } from 'zod/v4'
import { download } from 'tapestry-core-client/src/lib/file'
import { TapestryExporter, ProgressEvent } from '../services/tapestry-exporter'
import { resource } from '../services/rest-resources'

export interface UseTapestryExportOptions {
  tapestryId: string
  onError: () => unknown
  onSuccess: () => unknown
}

export function useTapestryExport({ tapestryId, onError, onSuccess }: UseTapestryExportOptions) {
  const [progress, setProgress] = useState<ProgressEvent>()

  const triggerExport = async () => {
    if (progress) {
      return
    }

    await new TapestryExporter(tapestryId, setProgress, (error) => {
      console.warn(
        'Error during export',
        error,
        error instanceof ZodError ? error.issues : undefined,
      )
      onError()
      setProgress(undefined)
    }).export((url, title) => {
      setProgress(undefined)
      download(url, `${title}.zip`)
      // Recorded for the admin reports; a failure must not affect the user
      void resource('tapestryExports').create({ tapestryId }).catch(noop)
      onSuccess()
    })
  }

  return {
    progress,
    triggerExport,
  }
}
