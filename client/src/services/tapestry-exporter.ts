import {
  ROOT_FILE,
  FILE_PREFIX,
  TYPE,
  CurrentExportSchema,
  CurrentExport,
} from 'tapestry-core/src/data-format/export'
import { BlobWriter, TextReader, ZipWriter, BlobReader, Reader } from '@zip.js/zip.js'
import { createDraft, finishDraft } from 'immer'
import { fileExtension, isMediaItem } from 'tapestry-core/src/utils'
import axios, { AxiosError } from 'axios'
import { noop, sumBy, uniqBy } from 'lodash-es'
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { PresentationStepDto } from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step'
import { listAll, resource } from './rest-resources'
import { generateItemThumbnailRenditionName } from 'tapestry-shared/src/utils'

const FILE_PATH_HEADER = 'File-Path-Header'

export type ProgressEvent = { download: number; compression: number } | 'pending'

interface Download {
  path: string
  blob: Blob
}

export class TapestryExporter {
  private toDownload?: number
  private downloadProgress: Record<string, { progress: number; total: number }> = {}
  private toCompress?: number
  private compressionProgress: Record<string, { progress: number; total: number }> = {}

  private downloaded = 0
  private compressed = 0

  private killSwitch = new AbortController()

  constructor(
    private tapestryId: string,
    private onProgress: (progress: ProgressEvent) => unknown,
  ) {
    this.killSwitch.signal.addEventListener('abort', () => (this.onProgress = noop), { once: true })
  }

  cancel() {
    this.killSwitch.abort()
  }

  async export(): Promise<File> {
    this.onProgress('pending')

    try {
      const signal = this.killSwitch.signal
      const tapestry = await resource('tapestries').read(
        { id: this.tapestryId },
        { include: ['items.thumbnail.renditions', 'rels', 'groups'] },
        { signal },
      )
      const presentation = await listAll(
        resource('presentationSteps'),
        { filter: { 'tapestryId:eq': this.tapestryId } },
        signal,
      )

      const { rootJson, downloads } = this.prepareExport(tapestry, presentation)

      this.toDownload = downloads.length
      const buffers = await this.parseDownloads(downloads, rootJson)

      const blobWriter = new BlobWriter()
      const zipWriter = new ZipWriter(blobWriter)
      const compressionPromises = [
        ...buffers.map(({ path, blob }) => this.addToWriter(zipWriter, path, new BlobReader(blob))),
        this.addToWriter(zipWriter, ROOT_FILE, new TextReader(JSON.stringify(rootJson))),
      ]

      this.toCompress = compressionPromises.length
      await Promise.all(compressionPromises)

      await zipWriter.close()

      return new File([await blobWriter.getData()], `${tapestry.title}.zip`, { type: TYPE })
    } catch (error) {
      this.killSwitch.abort()
      throw error
    }
  }

  private prepareExport(tapestry: TapestryDto, presentation: PresentationStepDto[]) {
    const draft = createDraft(tapestry)
    const downloads: Promise<Download>[] = []

    const addToDownloads = (source: string, id: string, prefix = '') => {
      const { pathname } = new URL(source)
      const [filename, extension] = fileExtension(pathname.split('/').at(-1)!)
      const filePath = `${prefix}${id} (${filename})${extension ? `.${extension}` : ''}`
      downloads.push(this.download(filePath, source))
      return `${FILE_PREFIX}${filePath}`
    }

    if (draft.thumbnail) {
      draft.thumbnail = addToDownloads(draft.thumbnail, 'thumbnail')
    }

    for (const item of draft.items ?? []) {
      if (isMediaItem(item) && item.internallyHosted) {
        item.source = addToDownloads(item.source, item.id, 'items/')
      }
      if (item.thumbnail) {
        // Make sure export is fault tolerant and doesn't fail in case of duplicate renditions
        item.thumbnail.renditions = uniqBy(item.thumbnail.renditions, (r) =>
          generateItemThumbnailRenditionName(item.id, r),
        )
        item.thumbnail.renditions.forEach((rendition) => {
          rendition.source = addToDownloads(
            rendition.source,
            generateItemThumbnailRenditionName(item.id, rendition),
            'items/',
          )
        })
      }
      // This needs to be done after the call to isMediaItem, since otherwise the zod parsing will fail
      // @ts-expect-error removing to comply with export schema
      delete item.tapestryId
    }

    for (const rel of draft.rels ?? []) {
      // @ts-expect-error removing to comply with export schema
      delete rel.tapestryId
    }

    for (const group of draft.groups ?? []) {
      // @ts-expect-error removing to comply with export schema
      delete group.tapestryId
    }

    const rootJson = CurrentExportSchema.parse({
      version: CurrentExportSchema.shape.version.value,
      ...finishDraft(draft),
      presentation,
    })

    return { rootJson, downloads }
  }

  private async download(filePath: string, source: string): Promise<Download> {
    const { data } = await axios.get<Blob>(source, {
      responseType: 'blob',
      headers: {
        // We use this custom header in order to identify which element's asset failed to download
        [FILE_PATH_HEADER]: filePath,
        // This one is here because of a bug in Chrome which appears in the following scenario:
        // 1) A request to an image item gets cached (triggered by the src attribute of an img tag)
        // 2) When we export we `fetch` the same URL (due to caching of the presigned URLs on the server)
        // 3) The fetch falls under different CORS policies than <img src="" />, but since it is cached
        //    the CORS requests fails
        //
        // Therefore we force the browser to make the request even if it can serve a cached response
        'Cache-Control': 'no-cache',
      },
      onDownloadProgress: ({ loaded, total }) => {
        this.downloadProgress[filePath] = { progress: loaded, total: total ?? 0 }
        const values = Object.values(this.downloadProgress)
        if (this.toDownload) {
          this.downloaded =
            sumBy(values, (v) => (v.total ? v.progress / v.total : 0)) / this.toDownload
        }
        this.notifyProgress()
      },
      signal: this.killSwitch.signal,
    })
    return { path: filePath, blob: data }
  }

  private async parseDownloads(downloads: Promise<Download>[], rootJson: CurrentExport) {
    const buffers: Download[] = []
    for (const result of await Promise.allSettled(downloads)) {
      if (result.status === 'fulfilled') {
        buffers.push(result.value)
      } else {
        // If we fail to download some resource utilize different strategies for recovery:
        //    1. For thumbnails (the tapestry's, an item's auto-generated or custom) simply nullify it in the export
        //    2. For media item sources - create an empty file, since the source field is required
        if (result.reason instanceof AxiosError) {
          const filePath = result.reason.config?.headers.get(FILE_PATH_HEADER) as string
          if (filePath) {
            const prefixedPath = `${FILE_PREFIX}${filePath}`
            if (rootJson.thumbnail === prefixedPath) {
              rootJson.thumbnail = undefined
              continue
            }

            let hasRecovered = false
            for (const i of rootJson.items ?? []) {
              // @ts-expect-error TS wants to check if the item is a media item
              if (i.source === prefixedPath) {
                hasRecovered = true
                buffers.push({ blob: new Blob([]), path: filePath })
                break
              }
              const idx = i.thumbnail?.renditions.findIndex((r) => r.source === prefixedPath) ?? -1
              if (idx >= 0) {
                i.thumbnail!.renditions.splice(idx, 1)
                if (i.thumbnail!.renditions.length === 0) {
                  delete i.thumbnail
                }
                hasRecovered = true
              }
            }
            if (hasRecovered) {
              continue
            }
          }
        }
        throw result.reason
      }
    }

    return buffers
  }

  private addToWriter<T>(zipWriter: ZipWriter<Blob>, path: string, reader: Reader<T>) {
    return zipWriter.add(path, reader, {
      onprogress: (progress) => {
        this.compressionProgress[path].progress = progress
        const values = Object.values(this.compressionProgress)
        if (this.toCompress) {
          this.compressed =
            sumBy(values, (v) => (v.total ? v.progress / v.total : 1)) / this.toCompress
        }
        this.notifyProgress()
        return undefined
      },
      onstart: (total) => {
        this.compressionProgress[path] = { progress: 0, total }
        return undefined
      },
      signal: this.killSwitch.signal,
    })
  }

  private notifyProgress() {
    if (
      this.toDownload &&
      this.downloaded !== 0 &&
      !(this.toDownload === 1 && this.compressed === 0)
    ) {
      this.onProgress({ download: this.downloaded, compression: this.compressed })
    } else {
      this.onProgress('pending')
    }
  }
}
