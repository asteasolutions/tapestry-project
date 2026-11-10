import { useState } from 'react'
import { uploadAsset } from '../model/data/utils'
import { resource } from '../services/rest-resources'
import { parseRootJson, ROOT_FILE } from 'tapestry-core/src/data-format/export'
import { BlobReader, TextWriter, ZipReader, FileEntry } from '@zip.js/zip.js'
import { useAsyncPolled } from './use-poll'
import { useLeaveWarning } from './use-leave-warning'
import { JobStatus } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry-create-job'
import { mapNotNull } from 'tapestry-core/src/lib/array'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'
import { CanceledError } from 'axios'

export type FileStatus = 'uploading' | JobStatus | 'cancelled'

const TERMINAL_STATUSES: FileStatus[] = ['cancelled', 'complete', 'failed']

export interface TapestryImport {
  id: string
  name: string
  progress: number
  status: FileStatus
  jobId?: string
  tapestryId?: string | null
  startedAt: number
  killSwitch: AbortController
}

async function checkZipValidity(file: File) {
  try {
    const zipReader = new ZipReader(new BlobReader(file))
    const entries = await zipReader.getEntries()

    const rootEntry = entries.find((e) => e.filename === ROOT_FILE) as FileEntry | undefined

    if (!rootEntry) {
      return false
    }

    const rootJson: unknown = JSON.parse(await rootEntry.getData(new TextWriter()))
    return parseRootJson(rootJson)
  } catch (error) {
    console.warn('Error checking zip file', error)
    return false
  }
}

export function useTapestryImport(onComplete: () => unknown) {
  const [imports, setImports] = useState<TapestryImport[]>()
  const onCompleteRef = usePropRef(onComplete)

  useLeaveWarning(!!imports?.some((i) => i.status === 'uploading'))

  function updateFile(idOrJobId: string, data: Partial<TapestryImport>) {
    setImports((current) =>
      current?.map((i) => (i.id === idOrJobId || i.jobId === idOrJobId ? { ...i, ...data } : i)),
    )
  }

  useAsyncPolled({
    action: async () => {
      const ids = mapNotNull(imports ?? [], (i) => i.jobId)
      if (ids.length === 0) return

      const { data: jobs } = await resource('tapestryCreateJob').list({
        filter: {
          'id:in': ids,
        },
      })
      for (const job of jobs) {
        const currentStatus = imports?.find(({ jobId }) => jobId === job.id)?.status
        if (job.status === 'complete' && currentStatus && currentStatus !== 'complete') {
          onCompleteRef.current()
        }
        updateFile(job.id, {
          status: job.status,
          progress: job.progress,
          tapestryId: job.tapestryId,
        })
      }
    },
    interval: 1000,
    paused: !imports || imports.every((i) => TERMINAL_STATUSES.includes(i.status)),
  })

  // New files are added to the ones already being imported, so that all of them are shown together
  const importTapestries = async (files: File[]) => {
    const newImports = files.map<TapestryImport>((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      progress: 0,
      status: 'uploading',
      startedAt: Date.now(),
      killSwitch: new AbortController(),
    }))
    setImports((current) => [...(current ?? []), ...newImports])

    await Promise.all(
      files.map(async (f, index) => {
        const { id: importId, killSwitch } = newImports[index]
        const { signal } = killSwitch
        try {
          if (!(await checkZipValidity(f))) {
            console.warn('Invalid zip file')
            updateFile(importId, { status: 'failed' })
            return
          }
          const s3Key = await uploadAsset(
            f,
            { type: 'import' },
            {
              signal,
              onProgress: (e) => updateFile(importId, { progress: e.progress ?? 0 }),
            },
          )
          updateFile(importId, { status: 'pending' })
          const { id } = await resource('tapestryCreateJob').create(
            { type: 'import', s3Key },
            undefined,
            { signal },
          )
          updateFile(importId, { jobId: id })
        } catch (e) {
          console.warn('Error importing file', f, e)
          updateFile(importId, { status: e instanceof CanceledError ? 'cancelled' : 'failed' })
        }
      }),
    )
  }

  return {
    imports,
    importTapestries,
    reset: () => {
      imports?.forEach((i) => i.killSwitch.abort())
      setImports(undefined)
    },
  }
}
