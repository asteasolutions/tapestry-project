import { ImageAssetRendition } from 'tapestry-core/src/data-format/schemas/item'
import { TapestryStageController } from '.'
import { Store } from '../../lib/store'
import { ItemViewModel, TapestryViewModel } from '../../view-model'
import { IdMap, idMapToArray } from 'tapestry-core/src/utils'
import { ORIGIN, Rectangle, scaleSize, Size } from 'tapestry-core/src/lib/geometry'
import { debounce, minBy, uniqueId } from 'lodash-es'
import { positionAtViewport } from '../../view-model/utils'
import {
  ThumbnailLoadError,
  ThumbnailLoadRequest,
  ThumbnailLoadResponse,
} from '../../workers/thumbnail-loader'
import { Texture } from 'pixi.js'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { snapshotRegistry } from '../renderer/item-renderer'
import { isMobile } from '../../lib/user-agent'

interface ItemThumbnailState {
  loadedRendition?: {
    bitmap: ImageBitmap
    meta: ImageAssetRendition
  }
  requestedRendition?: {
    requestId: string
    meta: ImageAssetRendition
  }
}

export class ItemThumbnailController implements TapestryStageController {
  private thumbnailLoader?: Worker
  private thumbnails: IdMap<ItemThumbnailState> = {}
  private initialRequestIds = new Set()
  private isInitialized = false

  constructor(private store: Store<TapestryViewModel>) {}

  init(): void {
    this.thumbnailLoader = new Worker(
      new URL('../../workers/thumbnail-loader.ts', import.meta.url),
      { type: 'module' },
    )
    this.thumbnailLoader.addEventListener('message', this.onThumbnailLoaderMessage)

    this.fetchInitialThumbnails()
  }

  dispose(): void {
    this.store.unsubscribe(this.recalculateLOD)
    this.store.unsubscribe(this.onItemsChanged)

    this.thumbnailLoader?.removeEventListener('message', this.onThumbnailLoaderMessage)
    this.thumbnailLoader?.terminate()
    this.thumbnailLoader = undefined
  }

  private onInitialized() {
    if (this.isInitialized) return

    this.isInitialized = true
    this.store.subscribe('viewport.transform', this.recalculateLOD)
    this.store.subscribe('items', this.onItemsChanged)

    this.recalculateLOD()
  }

  private onThumbnailLoaderMessage = (
    event: MessageEvent<ThumbnailLoadResponse | ThumbnailLoadError>,
  ) => {
    const { itemId, requestId } = event.data
    try {
      if (this.thumbnails[itemId]?.requestedRendition?.requestId !== requestId) {
        // This request has been rejected or ignored in the meantime.
        if (event.data.ok) {
          event.data.bitmap.close()
        }
        return
      }

      const { meta } = this.thumbnails[itemId].requestedRendition
      delete this.thumbnails[itemId].requestedRendition

      if (!event.data.ok) {
        // TODO[rado]: Failed to load thumbnail. What should we do here? Do we have any reasonable fallback?
        return
      }

      this.thumbnails[itemId].loadedRendition = { bitmap: event.data.bitmap, meta }
      this.updateItemSnapshot(itemId, Texture.from(event.data.bitmap))
    } finally {
      if (!this.isInitialized && this.initialRequestIds.has(requestId)) {
        this.initialRequestIds.delete(requestId)
        if (this.initialRequestIds.size === 0) {
          this.onInitialized()
        }
      }
    }
  }

  private fetchInitialThumbnails() {
    for (const item of idMapToArray(this.store.get('items'))) {
      const thumbnailRenditions = item.dto.thumbnail?.renditions ?? []
      const rendition = minBy(thumbnailRenditions, ({ size }) => size.width)
      if (!rendition) {
        // No thumbnail to load
        continue
      }

      const requestId = this.requestThumbnailRendition(item.dto.id, rendition)
      this.initialRequestIds.add(requestId)
    }
  }

  private computeMaxLOD(nItems: number) {
    // On mobile devices, try not to exceed 300 MB of bitmap memory for thumbnails
    const memoryBudget = isMobile ? 300 * (1 << 20) : Infinity
    const memoryBudgetPerItem = memoryBudget / nItems
    let maxLOD = 4096
    // Bitmaps store 4 bytes per pixel, so the bitmap size for a square image with side X is X * X * 4
    while (maxLOD * maxLOD * 4 > memoryBudgetPerItem) maxLOD /= 2
    return maxLOD
  }

  private recalculateLOD = debounce(() => {
    const viewport = this.store.get('viewport')
    const viewportRect = new Rectangle(
      positionAtViewport(viewport, ORIGIN),
      scaleSize(viewport.size, 1 / viewport.transform.scale),
    )
    const items = idMapToArray(this.store.get('items'))
    const maxLOD = this.computeMaxLOD(items.length)
    for (const item of idMapToArray(this.store.get('items'))) {
      this.recalculateLODForItem(item, viewport.transform.scale, viewportRect, maxLOD)
    }
  }, 250)

  private recalculateLODForItem(
    item: ItemViewModel,
    scale: number,
    viewportRect: Rectangle,
    maxLOD: number,
  ) {
    const itemId = item.dto.id
    const thumbnailRenditions = item.dto.thumbnail?.renditions ?? []
    const itemSize = scaleSize(item.dto.size, scale)
    const requiredRendition = this.findRenditionForSize(thumbnailRenditions, itemSize, maxLOD)
    if (!requiredRendition) {
      // This can happen only if the item has no thumbnail renditions at all. Nothing to do here in this case.
      return
    }

    this.thumbnails[itemId] ??= {}
    const { requestedRendition, loadedRendition } = this.thumbnails[itemId]
    const requestedOrLoadedRendition = requestedRendition ?? loadedRendition

    const isVisible = viewportRect.intersects(new Rectangle(item.dto))
    if (!isVisible && requestedOrLoadedRendition) return

    if ((requestedOrLoadedRendition?.meta.size.width ?? 0) < requiredRendition.size.width) {
      // We require a thumbnail with higher LOD than the one which is currently loaded or requested for this item.
      // TODO: At some point we may flag items for which we require lower LOD than currently loaded and offload
      // the higher resolution thumbnail in favor of a smaller one in order to save memory.
      this.requestThumbnailRendition(itemId, requiredRendition)
    }
  }

  private requestThumbnailRendition(itemId: string, rendition: ImageAssetRendition) {
    const requestId = uniqueId('thumbnail-request')
    this.thumbnailLoader?.postMessage({
      requestId,
      itemId,
      url: rendition.source,
    } satisfies ThumbnailLoadRequest)
    this.thumbnails[itemId] ??= {}
    this.thumbnails[itemId].requestedRendition = { requestId, meta: rendition }
    return requestId
  }

  private findRenditionForSize(renditions: ImageAssetRendition[], { width }: Size, maxLOD: number) {
    // Find the rendition having the closest width to the current item size, in pixels, adjusted by the device
    // pixel ratio (we want to load higher-resolution images on higher-resolution displays such as retina displays).
    // Thumbnail renditions should have the same aspect ratio as the item, so comparing only width should suffice.
    const levelOfDetail = Math.min(width * Math.min(2, window.devicePixelRatio), maxLOD)
    return minBy(renditions, ({ size }) => Math.abs(size.width - levelOfDetail))
  }

  private onItemsChanged = debounce((itemsMap: TapestryViewModel['items']) => {
    const viewport = this.store.get('viewport')
    const viewportRect = new Rectangle(
      positionAtViewport(viewport, ORIGIN),
      scaleSize(viewport.size, 1 / viewport.transform.scale),
    )
    const items = idMapToArray(itemsMap)
    const maxLOD = this.computeMaxLOD(items.length)
    for (const item of items) {
      const state = this.thumbnails[item.dto.id]
      const requestedOrLoadedRendition = (state?.requestedRendition ?? state?.loadedRendition)?.meta
      if (
        !requestedOrLoadedRendition ||
        item.dto.thumbnail?.renditions.every((r) => r.source !== requestedOrLoadedRendition.source)
      ) {
        this.recalculateLODForItem(item, viewport.transform.scale, viewportRect, maxLOD)
      }
    }

    Object.keys(this.thumbnails)
      .filter((itemId) => !(itemId in itemsMap))
      .forEach(this.destroyThumbnailForItem)
  }, 250)

  private destroyThumbnailForItem = (itemId: Id) => {
    if (!this.thumbnails[itemId]) return

    this.thumbnails[itemId].loadedRendition?.bitmap.close()
    delete this.thumbnails[itemId]
  }

  private updateItemSnapshot(itemId: string, snapshot: Texture | null | undefined) {
    const currentSnapshotId = this.store.get(`items.${itemId}.snapshotId`)
    if (currentSnapshotId && snapshotRegistry[currentSnapshotId]) {
      try {
        snapshotRegistry[currentSnapshotId].destroy(true)
        delete snapshotRegistry[currentSnapshotId]
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log("Error while destroying texture (it's fine)", error)
      }
    }

    const snapshotId = snapshot ? uniqueId('snapshot') : null
    if (snapshotId && snapshot) {
      snapshotRegistry[snapshotId] = snapshot
    }
    this.store.dispatch((model) => {
      if (model.items[itemId]) {
        model.items[itemId].snapshotId = snapshotId
      }
    })
  }
}
