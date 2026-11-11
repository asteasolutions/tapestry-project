import { useRef, useState } from 'react'
import { noop } from 'lodash-es'
import { ZodError } from 'zod/v4'
import { download } from 'tapestry-core-client/src/lib/file'
import { useLeaveWarning } from './use-leave-warning'
import { TapestryExporter, ProgressEvent } from '../services/tapestry-exporter'
import { resource } from '../services/rest-resources'

export type ExportStatus = 'exporting' | 'complete' | 'failed' | 'cancelled'

export interface TapestryExport {
  id: string
  tapestryId: string
  name: string
  progress: ProgressEvent
  status: ExportStatus
  startedAt: number
}

export interface UseTapestryExportOptions {
  onError: () => unknown
}

export function useTapestryExport({ onError }: UseTapestryExportOptions) {
  const [exports, setExports] = useState<TapestryExport[]>([])
  const exportersRef = useRef(new Map<string, { tapestryId: string; exporter: TapestryExporter }>())

  useLeaveWarning(exports.some((e) => e.status === 'exporting'))

  function updateExport(id: string, data: Partial<TapestryExport>) {
    setExports((current) => current.map((e) => (e.id === id ? { ...e, ...data } : e)))
  }

  function finish(id: string, status: ExportStatus) {
    if (!exportersRef.current.has(id)) {
      return
    }
    exportersRef.current.delete(id)
    updateExport(id, { status })
  }

  const getActiveExport = (tapestryId: string) =>
    exports.find((e) => e.tapestryId === tapestryId && e.status === 'exporting')

  const triggerExport = async (tapestryId: string, title: string) => {
    if ([...exportersRef.current.values()].some((e) => e.tapestryId === tapestryId)) {
      return
    }

    const id = crypto.randomUUID()
    const exporter: TapestryExporter = new TapestryExporter(
      tapestryId,
      (progress) => updateExport(id, { progress }),
      (error) => {
        if (!exportersRef.current.has(id)) {
          return
        }
        console.warn(
          'Error during export',
          error,
          error instanceof ZodError ? error.issues : undefined,
        )
        finish(id, 'failed')
        onError()
      },
    )
    exportersRef.current.set(id, { tapestryId, exporter })
    setExports((current) => [
      ...current,
      {
        id,
        tapestryId,
        name: `${title}.zip`,
        progress: 'pending',
        status: 'exporting',
        startedAt: Date.now(),
      },
    ])

    try {
      await exporter.export((url, exportedTitle) => {
        finish(id, 'complete')
        download(url, `${exportedTitle}.zip`)
        // Recorded for the admin reports; a failure must not affect the user
        void resource('tapestryExports').create({ tapestryId }).catch(noop)
      })
    } finally {
      finish(id, 'failed')
    }
  }

  const cancelExport = (id: string) => {
    exportersRef.current.get(id)?.exporter.cancel()
    finish(id, 'cancelled')
  }

  const clearFinished = () =>
    setExports((current) => current.filter((e) => e.status === 'exporting'))

  return {
    exports,
    getActiveExport,
    triggerExport,
    cancelExport,
    clearFinished,
  }
}
