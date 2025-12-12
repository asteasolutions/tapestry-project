import { forEach } from 'lodash-es'
import { uploadAsset } from '../model/data/utils'
import { Observable } from 'tapestry-core-client/src/lib/events/observable'
import { WritableDraft } from 'immer'
import { urlToFile } from 'tapestry-core-client/src/lib/file'
import { MediaItem } from 'tapestry-core/src/data-format/schemas/item'

type ItemUploadState = {
  state: 'uploading' | 'completed' | 'failed'
  itemId: string
  file: File
  progress?: number
  error?: unknown
  s3Key?: string
} & (
  | { state: 'uploading' }
  | { state: 'completed'; s3Key: string }
  | { state: 'failed'; error: unknown }
)

class ItemUploadObservable extends Observable<ItemUploadState[]> {
  private killSwitches: Record<string, AbortController> = {}

  async upload(item: MediaItem, tapestryId: string) {
    const { source: objectUrl, id } = item
    const existing = this.value.find(({ itemId }) => itemId === id)
    const file = existing?.file ?? (await urlToFile(objectUrl))
    if (existing) {
      this.mutateItem(id, (item) => {
        item.state = 'uploading'
      })
    } else {
      this.update((value) => {
        value.push({ state: 'uploading', itemId: id, file })
      })
    }
    try {
      const killSwitch = new AbortController()
      this.killSwitches[id] = killSwitch

      const key = await uploadAsset(
        file,
        { type: 'tapestry-asset', tapestryId },
        {
          onProgress: ({ progress }) => this.updateProgress(id, progress),
          signal: killSwitch.signal,
        },
      )

      this.complete(id, key)
      return key
    } catch (error) {
      this.fail(id, error)
      throw error
    }
  }

  cancel(url?: string) {
    if (url) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      this.killSwitches[url]?.abort()
    } else {
      forEach(this.killSwitches, (ctrl) => ctrl.abort())
    }
  }

  type(id: string) {
    return this.value.find(({ itemId }) => itemId === id)?.file.type
  }

  private updateProgress(itemId: string, progress: number | undefined) {
    this.mutateItem(itemId, (item) => {
      item.state = 'uploading'
      item.progress = progress
    })
  }

  private complete(itemId: string, s3Key: string) {
    this.mutateItem(itemId, (item) => {
      item.state = 'completed'
      item.s3Key = s3Key
    })
  }

  private fail(itemId: string, error: unknown) {
    this.mutateItem(itemId, (value) => {
      value.state = 'failed'
      value.error = error
    })
  }

  private mutateItem(id: string, mutator: (item: WritableDraft<ItemUploadState>) => unknown) {
    this.update((value) => {
      const item = value.find(({ itemId }) => itemId === id)
      if (item) {
        mutator(item)
      }
    })
  }
}

export const itemUpload = new ItemUploadObservable([])
