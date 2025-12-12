import {
  ROOT_FILE,
  FILE_PREFIX,
  TYPE,
  CurrentExportSchema,
  CurrentExport,
} from 'tapestry-core/src/data-format/export'
import { BlobWriter, TextReader, ZipWriter, BlobReader, Reader } from '@zip.js/zip.js'
import { createDraft, finishDraft } from 'immer'
import { fileExtension, hasThumbnail, isMediaItem } from 'tapestry-core/src/utils'
import axios, { AxiosError } from 'axios'
import { sumBy } from 'lodash-es'
import { listAll, resource } from './rest-resources'

const FILE_PATH_HEADER = 'File-Path-Header'

export type ProgressEvent = { download: number; compression: number } | 'pending'

interface Download {
  path: string
  blob: Blob
}

export class TapestryExporter {
  private toDownload = new Set<string>()
  private downloadProgress: Record<string, { progress: number; total: number }> = {}
  private toCompress = new Set<string>()
  private compressionProgress: Record<string, { progress: number; total: number }> = {}

  private downloaded = 0
  private compressed = 0

  private blobWriter!: BlobWriter
  private zipWriter!: ZipWriter<Blob>

  private killSwitch = new AbortController()

  constructor(
    private tapestryId: string,
    private progressCallback: (progress: ProgressEvent) => unknown,
    private errorCallback: (error: unknown) => unknown,
  ) {}

  private async download(filePath: string, source: string) {
    this.toDownload.add(filePath)
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
        this.downloadProgress[filePath] = { progress: loaded, total: total! }
        const values = Object.values(this.downloadProgress)
        this.downloaded = sumBy(values, (v) => v.progress) / sumBy(values, (v) => v.total)
        this.notifyProgress()
      },
      signal: this.killSwitch.signal,
    })
    return { path: filePath, blob: data }
  }

  async export(callback: (url: string, title: string) => unknown) {
    this.blobWriter = new BlobWriter()
    this.zipWriter = new ZipWriter(this.blobWriter)

    try {
      const tapestry = await resource('tapestries').read(
        { id: this.tapestryId },
        { include: ['items', 'rels', 'groups'] },
        { signal: this.killSwitch.signal },
      )
      const presentation = await listAll(
        resource('presentationSteps'),
        { filter: { 'tapestryId:eq': this.tapestryId } },
        this.killSwitch.signal,
      )

      const draft = createDraft(tapestry)

      const downloads: Promise<Download>[] = []

      const addToDownloads = (source: string, id: string, prefix = '') => {
        const { pathname } = new URL(source)
        const [filename, extension] = fileExtension(pathname.split('/').at(-1)!)
        const filePath = `${prefix}${id} (${filename})${extension ? `.${extension}` : ''}`
        downloads.push(this.download(filePath, source))
        return filePath
      }

      if (draft.thumbnail) {
        const filePath = addToDownloads(draft.thumbnail, 'thumbnail')
        draft.thumbnail = `${FILE_PREFIX}${filePath}`
      }

      for (const item of draft.items ?? []) {
        if (isMediaItem(item) && item.internallyHosted) {
          const filePath = addToDownloads(item.source, item.id, 'items/')
          item.source = `${FILE_PREFIX}${filePath}`
        }
        if (hasThumbnail(item)) {
          const filePath = addToDownloads(item.thumbnail.source, `${item.id}-thumbnail`, 'items/')
          item.thumbnail.source = `${FILE_PREFIX}${filePath}`
        }
        if (item.customThumbnail) {
          const filePath = addToDownloads(
            item.customThumbnail,
            `${item.id}-custom-thumbnail`,
            'items/',
          )
          item.customThumbnail = `${FILE_PREFIX}${filePath}`
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

      const buffers = await this.parseDownloads(downloads, rootJson)
      const compressionPromises = []
      for (const { path, blob } of buffers) {
        compressionPromises.push(this.addToWriter(path, new BlobReader(blob)))
      }
      compressionPromises.push(
        this.addToWriter(ROOT_FILE, new TextReader(JSON.stringify(rootJson))),
      )

      await Promise.all(compressionPromises)

      await this.zipWriter.close()

      const file = new File([await this.blobWriter.getData()], `tapestry ${tapestry.title}.zip`, {
        type: TYPE,
      })

      const url = URL.createObjectURL(file)
      callback(url, tapestry.title)
      URL.revokeObjectURL(url)
    } catch (error) {
      this.killSwitch.abort()
      this.errorCallback(error)
    }
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
              // @ts-expect-error TS wants to check if the item has a thumbnail
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (i.thumbnail?.source === prefixedPath) {
                // @ts-expect-error see above
                i.thumbnail = undefined
                hasRecovered = true
                break
              }
              if (i.customThumbnail === prefixedPath) {
                i.customThumbnail = undefined
                hasRecovered = true
                break
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

  private addToWriter<T>(path: string, reader: Reader<T>) {
    this.toCompress.add(path)
    return this.zipWriter.add(path, reader, {
      onprogress: (progress) => {
        this.compressionProgress[path].progress = progress
        const values = Object.values(this.compressionProgress)
        this.compressed = sumBy(values, (v) => v.progress) / sumBy(values, (v) => v.total)
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
    const allDownloading = this.toDownload.size === Object.keys(this.downloadProgress).length
    const allCompressing = this.toCompress.size === Object.keys(this.compressionProgress).length

    if ((allDownloading && this.downloaded !== 1) || allCompressing) {
      this.progressCallback({ compression: this.compressed, download: this.downloaded })
    } else {
      this.progressCallback('pending')
    }
  }
}
