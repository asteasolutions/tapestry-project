import { BlobReader, FileEntry, TextWriter, ZipReader } from '@zip.js/zip.js'
import { CanceledError } from 'axios'
import { noop } from 'lodash-es'
import { ZodError } from 'zod/v4'
import { download } from 'tapestry-core-client/src/lib/file'
import { Observable } from 'tapestry-core-client/src/lib/events/observable'
import { parseRootJson, ROOT_FILE } from 'tapestry-core/src/data-format/export'
import { JobStatus } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry-create-job'
import { uploadAsset } from '../model/data/utils'
import { resource } from './rest-resources'
import { ProgressEvent, TapestryExporter } from './tapestry-exporter'

export type ExportStatus = 'exporting' | 'complete' | 'failed' | 'cancelled'
export type FileStatus = 'uploading' | JobStatus | 'cancelled'

const TERMINAL_IMPORT_STATUSES: FileStatus[] = ['cancelled', 'complete', 'failed']
const POLL_INTERVAL = 1000

export interface TapestryExport {
  id: string
  tapestryId: string
  name: string
  progress: ProgressEvent
  status: ExportStatus
  startedAt: number
}

export interface TapestryImport {
  id: string
  name: string
  progress: number
  status: FileStatus
  error?: string
  jobId?: string
  tapestryId?: string | null
  startedAt: number
  killSwitch: AbortController
}

export interface BackgroundTasksState {
  imports: TapestryImport[]
  exports: TapestryExport[]
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

export function findActiveExport(exports: TapestryExport[], tapestryId: string) {
  return exports.find((e) => e.tapestryId === tapestryId && e.status === 'exporting')
}

class BackgroundTasksObservable extends Observable<BackgroundTasksState> {
  private exporters = new Map<string, TapestryExporter>()
  private pollTimeout?: number

  constructor() {
    super({ imports: [], exports: [] })

    window.addEventListener('beforeunload', (e) => {
      const { exports, imports } = this.value
      if (
        exports.some((ex) => ex.status === 'exporting') ||
        imports.some((i) => i.status === 'uploading')
      ) {
        e.preventDefault()
      }
    })
  }

  async triggerExport(tapestryId: string, title: string) {
    if (findActiveExport(this.value.exports, tapestryId)) {
      return
    }

    const id = crypto.randomUUID()
    const exporter = new TapestryExporter(
      tapestryId,
      (progress) => this.updateExport(id, { progress }),
      (error) => {
        if (!this.exporters.has(id)) {
          return
        }
        console.warn(
          'Error during export',
          error,
          error instanceof ZodError ? error.issues : undefined,
        )
        this.finishExport(id, 'failed')
      },
    )
    this.exporters.set(id, exporter)
    this.update((value) => {
      value.exports.push({
        id,
        tapestryId,
        name: `${title}.zip`,
        progress: 'pending',
        status: 'exporting',
        startedAt: Date.now(),
      })
    })

    try {
      await exporter.export((url, exportedTitle) => {
        this.finishExport(id, 'complete')
        download(url, `${exportedTitle}.zip`)
        // Recorded for the admin reports; a failure must not affect the user
        void resource('tapestryExports').create({ tapestryId }).catch(noop)
      })
    } finally {
      this.finishExport(id, 'failed')
    }
  }

  cancelExport(id: string) {
    this.exporters.get(id)?.cancel()
    this.finishExport(id, 'cancelled')
  }

  async importTapestries(files: File[]) {
    const newImports = files.map<TapestryImport>((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      progress: 0,
      status: 'uploading',
      startedAt: Date.now(),
      killSwitch: new AbortController(),
    }))
    this.update((value) => {
      value.imports.push(...newImports)
    })

    await Promise.all(
      files.map(async (f, index) => {
        const { id: importId, killSwitch } = newImports[index]
        const { signal } = killSwitch
        try {
          if (!(await checkZipValidity(f))) {
            console.warn('Invalid zip file')
            this.updateImport(importId, { status: 'failed', error: 'Invalid zip file' })
            return
          }
          const s3Key = await uploadAsset(
            f,
            { type: 'import' },
            {
              signal,
              onProgress: (e) => this.updateImport(importId, { progress: e.progress ?? 0 }),
            },
          )
          this.updateImport(importId, { status: 'pending' })
          const { id } = await resource('tapestryCreateJob').create(
            { type: 'import', s3Key },
            undefined,
            { signal },
          )
          this.updateImport(importId, { jobId: id })
          this.schedulePoll()
        } catch (e) {
          console.warn('Error importing file', f, e)
          this.updateImport(
            importId,
            e instanceof CanceledError
              ? { status: 'cancelled' }
              : { status: 'failed', error: 'Upload failed' },
          )
        }
      }),
    )
  }

  clearFinished() {
    this.update((value) => {
      value.imports = value.imports.filter((i) => !TERMINAL_IMPORT_STATUSES.includes(i.status))
      value.exports = value.exports.filter((e) => e.status === 'exporting')
    })
  }

  private updateExport(id: string, data: Partial<TapestryExport>) {
    this.update((value) => {
      const tapestryExport = value.exports.find((e) => e.id === id)
      if (tapestryExport) {
        Object.assign(tapestryExport, data)
      }
    })
  }

  private finishExport(id: string, status: ExportStatus) {
    if (!this.exporters.delete(id)) {
      return
    }
    this.updateExport(id, { status })
  }

  private updateImport(idOrJobId: string, data: Partial<TapestryImport>) {
    this.update((value) => {
      const tapestryImport = value.imports.find((i) => i.id === idOrJobId || i.jobId === idOrJobId)
      if (tapestryImport) {
        Object.assign(tapestryImport, data)
      }
    })
  }

  private get pendingJobIds() {
    return this.value.imports
      .filter((i) => i.jobId && !TERMINAL_IMPORT_STATUSES.includes(i.status))
      .map((i) => i.jobId!)
  }

  private schedulePoll() {
    this.pollTimeout ??= window.setTimeout(() => void this.poll(), POLL_INTERVAL)
  }

  private async poll() {
    try {
      const ids = this.pendingJobIds
      if (ids.length === 0) {
        return
      }
      const { data: jobs } = await resource('tapestryCreateJob').list({
        filter: { 'id:in': ids },
      })
      for (const job of jobs) {
        this.updateImport(job.id, {
          status: job.status,
          progress: job.progress,
          tapestryId: job.tapestryId,
        })
      }
    } catch (error) {
      console.warn('Error polling import jobs', error)
    } finally {
      this.pollTimeout = undefined
      if (this.pendingJobIds.length > 0) {
        this.schedulePoll()
      }
    }
  }
}

export const backgroundTasks = new BackgroundTasksObservable()
