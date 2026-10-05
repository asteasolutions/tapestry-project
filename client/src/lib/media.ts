import { pick } from 'lodash-es'
import { pdfjs } from 'react-pdf'
import { urlToBlob } from 'tapestry-core-client/src/lib/file'
import { aspectRatio, clampSize, innerFit, Size } from 'tapestry-core/src/lib/geometry'
import { WEB_SOURCE_PARSERS } from 'tapestry-core/src/web-sources'
import { resource } from '../services/rest-resources'
import { getBoundingRectangle } from 'tapestry-core-client/src/view-model/utils'
import { createItemViewModel } from '../pages/tapestry/view-model/utils'
import { duplicateItem } from '../model/data/utils'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'

export type MediaItemSource = File | string

function mediaSourceToSrc(source: MediaItemSource) {
  return typeof source === 'string' ? source : URL.createObjectURL(source)
}

export async function loadImageFromBlob(file: Blob) {
  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.src = objectUrl
  await image.decode()
  URL.revokeObjectURL(objectUrl)
  return image
}

export function mediaSourceToBlob(source: MediaItemSource) {
  return source instanceof File ? source : urlToBlob(source)
}

const HEIC_CONVERT_QUALITY = 0.92

export async function convertHeicFile(blob: Blob) {
  const { heicTo } = await import('heic-to')
  const jpegBlob = await heicTo({ blob, type: 'image/jpeg', quality: HEIC_CONVERT_QUALITY })

  return new File([jpegBlob], 'converted.jpg', { type: 'image/jpeg' })
}

export const MIN_ITEM_SIZE: Size = {
  width: 100,
  height: 40,
}

export const MAX_ITEM_SIZE: Size = {
  width: 2000,
  height: 2000,
}

export async function getImageSize(source: MediaItemSource): Promise<Size> {
  const image = await loadImageFromBlob(await mediaSourceToBlob(source))
  return pick(image, 'width', 'height')
}

function getClampedItemSize(size: Size) {
  return clampSize(size, MIN_ITEM_SIZE, MAX_ITEM_SIZE)
}

export async function getImageItemSize(source: MediaItemSource, width?: number): Promise<Size> {
  const image = await loadImageFromBlob(await mediaSourceToBlob(source))
  const defaultImageWidth = 300
  const imageWidth = width ?? defaultImageWidth

  return getClampedItemSize({
    width: imageWidth,
    height: imageWidth / aspectRatio(image),
  })
}

const DEFAULT_VIDEO_WIDTH = 500

export async function getVideoItemSize(source: MediaItemSource): Promise<Size> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.src = mediaSourceToSrc(source)

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve({
        width: DEFAULT_VIDEO_WIDTH,
        height: (DEFAULT_VIDEO_WIDTH * video.videoHeight) / video.videoWidth,
      })
    }
  })
}

export async function getPDFItemSize(source: MediaItemSource): Promise<Size> {
  const src = mediaSourceToSrc(source)

  const doc = await pdfjs.getDocument(src).promise
  const { width, height } = (await doc.getPage(1)).getViewport({ scale: 1 })
  const aspectRatio = height / width

  const defaultPDFWidth = 300

  return getClampedItemSize({
    width: defaultPDFWidth,
    height: defaultPDFWidth * aspectRatio,
  })
}

const DEFAULT_WEBPAGE_SIZE: Size = {
  width: 400,
  height: 500,
}
const EMBEDDED_TAPESTRY_MAX_SIDE_SIZE = 700
const EMBEDDED_TAPESTRY_DEFAULT_SIZE: Size = {
  width: EMBEDDED_TAPESTRY_MAX_SIDE_SIZE,
  height: EMBEDDED_TAPESTRY_MAX_SIDE_SIZE / 2,
}
const EMBEDDED_TAPESTRY_TOOLBAR_PADDING = 130

async function fetchTapestry(source: string) {
  const url = new URL(source)
  const segments = url.pathname.replace(/^\/?/, '').split('/')

  //path by username and slug: .../u/:username/:slug
  if (segments[0] === 'u' && segments[1] && segments[2]) {
    return resource('tapestries').read(
      {
        id: `${segments[1]}/${segments[2]}`,
      },
      { include: ['items'] },
    )
  }

  //path by id:  .../t/:tapestryId
  if (segments[0] === 't' && segments[1]) {
    return await resource('tapestries').read(
      {
        id: segments[1],
      },
      { include: ['items'] },
    )
  }
  return
}

async function getEmbeddedTapestrySize(source: string): Promise<Size> {
  const tapestry = await fetchTapestry(source)
  if (!tapestry) {
    return EMBEDDED_TAPESTRY_DEFAULT_SIZE
  }
  let width = 0
  let height = 0

  if (tapestry.startView) {
    width = tapestry.startView.size.width
    height = tapestry.startView.size.height
  } else {
    if (!tapestry.items || tapestry.items.length === 0) {
      return EMBEDDED_TAPESTRY_DEFAULT_SIZE
    }

    const viewModels = tapestry.items.map((item: ItemDto) =>
      createItemViewModel(duplicateItem(item)),
    )
    const rectangle = getBoundingRectangle(viewModels)
    width = rectangle.width
    height = rectangle.height
  }

  if (width <= 0 || height <= 0) {
    return EMBEDDED_TAPESTRY_DEFAULT_SIZE
  }

  const fittedSize = innerFit(
    { width, height },
    { width: EMBEDDED_TAPESTRY_MAX_SIDE_SIZE, height: EMBEDDED_TAPESTRY_MAX_SIDE_SIZE },
  )

  return {
    width: fittedSize.width,
    height: fittedSize.height + EMBEDDED_TAPESTRY_TOOLBAR_PADDING,
  }
}

export async function getWebpageItemSize(source: MediaItemSource): Promise<Size> {
  if (source instanceof File) {
    return DEFAULT_WEBPAGE_SIZE
  }

  const { host, pathname } = new URL(source)
  // We are checking if the user is trying to open a book from the IA in a 2-page mode
  if (host.endsWith('archive.org') && pathname.includes('mode/2up')) {
    return {
      // It looks like 800px is the threshold beneath which IA displays their books in a single page mode regardless of the mode parameter
      width: 801,
      height: 500,
    }
  }

  if (await WEB_SOURCE_PARSERS.youtube.matches(source)) {
    return getClampedItemSize(await WEB_SOURCE_PARSERS.youtube.getVideoSize(source))
  }

  if (await WEB_SOURCE_PARSERS.vimeo.matches(source)) {
    return {
      width: DEFAULT_VIDEO_WIDTH,
      height: DEFAULT_VIDEO_WIDTH * (9 / 16),
    }
  }

  if (host === window.location.host) {
    return getEmbeddedTapestrySize(source)
  }

  return Promise.resolve(DEFAULT_WEBPAGE_SIZE)
}

export async function compressImage(file: File, size?: Size, quality = 0.4) {
  return new Promise<File>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url
    img.onerror = (e) => {
      console.warn(e)
      URL.revokeObjectURL(url)
      reject(new Error('Error loading image'))
    }
    img.onload = () => {
      URL.revokeObjectURL(url)

      const { width: finalWidth, height: finalHeight } = clampSize(
        img,
        size ? innerFit(img, size) : { width: 0, height: 0 },
        innerFit(img, MAX_ITEM_SIZE),
      )
      const canvas = document.createElement('canvas')
      canvas.width = finalWidth
      canvas.height = finalHeight
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        return reject(new Error('Cannot create drawing context'))
      }

      ctx.drawImage(img, 0, 0, finalWidth, finalHeight)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Error creating blob'))
          }
          resolve(blob.size < file.size ? new File([blob], file.name) : file)
        },
        'image/jpeg',
        quality,
      )
    }
  })
}
