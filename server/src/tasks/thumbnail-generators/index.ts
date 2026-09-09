import { Size } from 'tapestry-core/src/data-format/schemas/common'
import { Item, ItemType } from '@prisma/client'
import { parseDBItemSource } from '../../transformers/item.js'
import { generateVideoThumbnail } from './video.js'
import { generatePDFThumbnail } from './pdf.js'
import { generateImageThumbnail } from './image.js'
import { generateWebpageThumbnail, generateYoutubeThumbnail } from './webpage.js'
import { getResolvedImageService, iiifImageURL } from 'tapestry-core/src/iiif.js'

export interface ThumbnailRenditionOutput {
  data: Buffer<ArrayBufferLike>
  extension: string
  format: string
  size: Size
}

const MIN_THUMBNAIL_SIZE = 600

const ITEM_TYPES_WITH_INHERENT_THUMBNAIL = ['pdf', 'video', 'image', 'iiif', 'webpage'] as const
export type ItemTypeWithInherentThumbnail = (typeof ITEM_TYPES_WITH_INHERENT_THUMBNAIL)[number]

export function hasInherentThumbnail(
  item: Item,
): item is Item & { type: ItemTypeWithInherentThumbnail } {
  return (ITEM_TYPES_WITH_INHERENT_THUMBNAIL as readonly ItemType[]).includes(item.type)
}

export async function generatePrimaryThumbnail(
  item: Item & { type: ItemTypeWithInherentThumbnail },
) {
  if (item.type === 'iiif') {
    // An iiif item is a deep-zoom tiled image, not a flat one. Render a bounded derivative
    // from the IIIF Image API instead, for use as the thumbnail. The item's source is the
    // manifest URL, with the resolved image service URL encoded as a query param.
    const thumbWidth = Math.max(MIN_THUMBNAIL_SIZE, item.width)
    const imageService = getResolvedImageService(item.source!)!
    const derivativeUrl = iiifImageURL(imageService, { size: `${thumbWidth},` })
    return generateImageThumbnail(derivativeUrl, { maxDim: thumbWidth })
  }

  if (item.type === 'pdf' || item.type === 'video' || item.type === 'image') {
    const source = (await parseDBItemSource(item.source!)).source
    // We cannot make thumbnails for blob URLs. The thumbnail creation job should be re-triggered
    // when the source is changed.
    if (source.startsWith('blob:')) return

    const thumbWidth = Math.max(MIN_THUMBNAIL_SIZE, item.width)
    if (item.type === 'pdf') {
      return generatePDFThumbnail(source, item.defaultPage ?? 1, thumbWidth)
    }
    if (item.type === 'video') {
      return generateVideoThumbnail(source, item.startTime || undefined, thumbWidth)
    }
    return generateImageThumbnail(source, { maxDim: thumbWidth })
  }

  const { width, height, source, webpageType } = item

  if (webpageType === 'youtube') {
    return generateYoutubeThumbnail(source!)
  }

  return generateWebpageThumbnail({ url: source!, windowSize: { width, height }, timeout: 120_000 })
}
