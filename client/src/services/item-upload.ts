import { forEach } from 'lodash-es'
import { uploadAsset } from '../model/data/utils'
import { Observable } from 'tapestry-core-client/src/lib/events/observable'
import { WritableDraft } from 'immer'

type ItemUploadState = {
  state: 'pending' | 'uploading' | 'completed' | 'failed'
  objectUrl: string
  file: File
  progress?: number
  error?: unknown
  s3Key?: string
} & (
  | { state: 'pending' }
  | { state: 'uploading' }
  | { state: 'completed'; s3Key: string }
  | { state: 'failed'; error: unknown }
)

class ItemUploadObservable extends Observable<ItemUploadState[]> {
  private killSwitches: Record<string, AbortController> = {}

  prepare(file: File) {
    const objectUrl = URL.createObjectURL(file)
    this.update((value) => {
      value.push({ state: 'pending', objectUrl, file })
    })
    return objectUrl
  }

  async upload(objectUrl: string, tapestryId: string) {
    const item = this.value.find((item) => item.objectUrl === objectUrl)
    if (!item) {
      throw new Error(`Item for url ${objectUrl} not found`)
    }
    if (item.state !== 'pending') {
      throw new Error(`Cannot upload item in state "${item.state}"]`)
    }
    try {
      const killSwitch = new AbortController()
      this.killSwitches[objectUrl] = killSwitch

      const key = await uploadAsset(
        item.file,
        { type: 'tapestry-asset', tapestryId },
        {
          onProgress: ({ progress }) => this.updateProgress(objectUrl, progress),
          signal: killSwitch.signal,
        },
      )

      this.complete(objectUrl, key)
      return key
    } catch (error) {
      this.fail(objectUrl, error)
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

  type(url: string) {
    return this.value.find((item) => item.objectUrl === url)?.file.type
  }

  private updateProgress(objectUrl: string, progress: number | undefined) {
    this.mutateItem(objectUrl, (item) => {
      item.state = 'uploading'
      item.progress = progress
    })
  }

  private complete(objectUrl: string, s3Key: string) {
    this.mutateItem(objectUrl, (item) => {
      item.state = 'completed'
      item.s3Key = s3Key
    })
  }

  private fail(objectUrl: string, error: unknown) {
    this.mutateItem(objectUrl, (value) => {
      value.state = 'failed'
      value.error = error
    })
  }

  private mutateItem(
    objectUrl: string,
    mutator: (item: WritableDraft<ItemUploadState>) => unknown,
  ) {
    this.update((value) => {
      const item = value.find((i) => i.objectUrl === objectUrl)
      if (item) {
        mutator(item)
      }
    })
  }
}

export const itemUpload = new ItemUploadObservable([])
