import type { Size } from 'tapestry-core/src/lib/geometry'
import { fetchBitmap } from '../lib/file'

interface BaseThumbnailLoadMessage {
  requestId: string
  itemId: string
}

export interface ThumbnailLoadRequest extends BaseThumbnailLoadMessage {
  url: string
  resize?: Size
}

export interface ThumbnailLoadResponse extends BaseThumbnailLoadMessage {
  ok: true
  bitmap: ImageBitmap
}

export interface ThumbnailLoadError extends BaseThumbnailLoadMessage {
  ok: false
  error: string
}

onmessage = async (e: MessageEvent<ThumbnailLoadRequest>) => {
  const { requestId, itemId, url, resize } = e.data
  try {
    const bitmap = await fetchBitmap(url, resize)

    postMessage({ requestId, itemId, ok: true, bitmap } satisfies ThumbnailLoadResponse, {
      transfer: [bitmap],
    })
  } catch (error) {
    const message = String((error as { message?: string }).message ?? error)
    postMessage({ requestId, itemId, ok: false, error: message } satisfies ThumbnailLoadError)
  }
}
