import { useEffect, useRef, useState } from 'react'
import { ZodError } from 'zod/v4'
import { download } from 'tapestry-core-client/src/lib/file'
import { TapestryExporter, ProgressEvent } from '../services/tapestry-exporter'

export interface UseTapestryExportOptions {
  tapestryId: string
  onError: () => unknown
  onSuccess?: () => unknown
}

export function useTapestryExport({ tapestryId, onError, onSuccess }: UseTapestryExportOptions) {
  const [progress, setProgress] = useState<ProgressEvent>()
  const exporterRef = useRef<TapestryExporter>(null)
  const isExporting = !!progress

  useEffect(() => {
    if (!isExporting) {
      return
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isExporting])

  const triggerExport = async () => {
    if (progress || exporterRef.current) {
      return
    }

    const exporter = new TapestryExporter(tapestryId, setProgress, (error) => {
      if (exporterRef.current !== exporter) {
        // The export was cancelled by the user
        return
      }
      exporterRef.current = null
      console.warn(
        'Error during export',
        error,
        error instanceof ZodError ? error.issues : undefined,
      )
      setProgress(undefined)
      onError()
    })
    exporterRef.current = exporter

    try {
      await exporter.export((url, title) => {
        exporterRef.current = null
        setProgress(undefined)
        download(url, `${title}.zip`)
        onSuccess?.()
      })
    } finally {
      if (exporterRef.current === exporter) {
        exporterRef.current = null
        setProgress(undefined)
      }
    }
  }

  const cancelExport = () => {
    exporterRef.current?.cancel()
    exporterRef.current = null
    setProgress(undefined)
  }

  return {
    progress,
    triggerExport,
    cancelExport,
  }
}

export type TapestryExport = ReturnType<typeof useTapestryExport>
