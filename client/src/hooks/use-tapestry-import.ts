import { useState } from 'react'
import { uploadAsset } from '../model/data/utils'
import { resource } from '../services/rest-resources'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { parseRootJson, ROOT_FILE } from 'tapestry-core/src/data-format/export'
import { BlobReader, TextWriter, ZipReader, FileEntry } from '@zip.js/zip.js'
import { useAsyncPolled } from './use-poll'
import { isNumber } from 'lodash'
import { JobStatus } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry-create-job'
import { mapNotNull } from 'tapestry-core/src/lib/array'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'
import { CanceledError } from 'axios'

export type FileStatus = 'uploading' | JobStatus | 'cancelled'

const TERMINAL_STATUSES: FileStatus[] = ['cancelled', 'complete', 'failed']

export interface TapestryImport {
  name: string
  progress: number
  status: FileStatus
  jobId?: string
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

  function updateFile(indexOrJobId: number | string, data: Partial<TapestryImport>) {
    setImports((current) => {
      if (!current) {
        return
      }
      const elem = isNumber(indexOrJobId)
        ? current[indexOrJobId]
        : current.find(({ jobId }) => jobId === indexOrJobId)
      if (elem) {
        Object.assign(elem, data)
      }
      return [...current]
    })
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
        updateFile(job.id, { status: job.status, progress: job.progress })
      }
    },
    interval: 1000,
    paused: !imports || imports.every((i) => TERMINAL_STATUSES.includes(i.status)),
  })

  const { perform: importTapestries } = useAsyncAction(
    async ({ signal: unmountSignal }, files: File[]) => {
      const imports = files.map<TapestryImport>((f) => ({
        name: f.name,
        progress: 0,
        status: 'uploading',
        killSwitch: new AbortController(),
      }))
      setImports(imports)

      const promises = files.map(async (f, i) => {
        const signal = AbortSignal.any([unmountSignal, imports[i].killSwitch.signal])
        try {
          if (!(await checkZipValidity(f))) {
            console.warn('Invalid zip file')
            updateFile(i, { status: 'failed' })
            return
          }
          const s3Key = await uploadAsset(
            f,
            { type: 'import' },
            {
              signal,
              onProgress: (e) => updateFile(i, { progress: e.progress ?? 0 }),
            },
          )
          updateFile(i, { status: 'pending' })
          const { id } = await resource('tapestryCreateJob').create(
            { type: 'import', s3Key },
            undefined,
            { signal },
          )
          updateFile(i, { jobId: id })
        } catch (e) {
          console.warn('Error importing file', f, e)
          updateFile(i, { status: e instanceof CanceledError ? 'cancelled' : 'failed' })
        }
      })
      await Promise.all(promises)
    },
  )

  return {
    imports,
    importTapestries,
    reset: () => {
      imports?.forEach((i) => i.killSwitch.abort())
      setImports(undefined)
    },
  }
}
