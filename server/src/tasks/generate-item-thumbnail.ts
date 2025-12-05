import { JobTypeMap } from './index.js'
import { s3Service, tapestryKey } from '../services/s3-service.js'
import { prisma } from '../db.js'
import { takeScreenshot } from './puppeteer.js'
import axios from 'axios'
import { OEmbed } from 'tapestry-core/src/oembed.js'
import { Item, ItemType } from '@prisma/client'
import { scheduleTapestryThumbnailGeneration } from '../resources/tapestries.js'
import { parseDBItemSource } from '../transformers/item.js'
import { WEB_SOURCE_PARSERS } from 'tapestry-core/src/web-sources/index.js'
import { extractVideoFrame, getVideoFPS } from './ffmpeg.js'
import { isBlobURL } from 'tapestry-core/src/utils.js'
import { screenshotPage } from './pdf.js'

async function getPDFThumbnail(item: Item) {
  const { source } = await parseDBItemSource(item.source!)
  if (isBlobURL(source)) {
    return
  }

  return screenshotPage(source, item.defaultPage ?? 1)
}

async function getYoutubeThumbnail(embedUrl: string) {
  const { data: oembed } = await axios.get<OEmbed>(
    `https://www.youtube.com/oembed?url=${WEB_SOURCE_PARSERS.youtube.getWatchUrl(embedUrl)}`,
  )
  const { type, thumbnail_url } = oembed
  if (type !== 'video' || !thumbnail_url) {
    return undefined
  }
  const { data: blob } = await axios.get<ArrayBuffer>(thumbnail_url, {
    responseType: 'arraybuffer',
  })
  return blob
}

async function getVideoThumbnail(item: Item): Promise<Buffer | undefined> {
  const { source } = await parseDBItemSource(item.source!)
  // Upon initial upload the source is the local blob, so we skip it.
  // After uploading the video to S3 an item update will come with the object key
  // based off of which we will extract the video thumbnail
  if (isBlobURL(source)) {
    return
  }
  const startFrame = item.startTime ? (await getVideoFPS(source)) * item.startTime : undefined
  return extractVideoFrame(source, startFrame)
}

async function getThumbnail(item: Item) {
  if (item.type === 'pdf') {
    return getPDFThumbnail(item)
  }
  if (item.type === 'video') {
    return getVideoThumbnail(item)
  }

  const { width, height, source, webpageType } = item

  if (webpageType === 'youtube') {
    const buffer = await getYoutubeThumbnail(source!)
    if (buffer) {
      return new Uint8Array(buffer)
    }
  }

  return takeScreenshot(source!, { width, height, timeout: 120_000 })
}

const THUMBNAIL_TYPES: ItemType[] = ['webpage', 'video', 'pdf']

export async function generateItemThumbnail({ itemId }: JobTypeMap['generate-item-thumbnail']) {
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId } })
  const { type } = item

  if (!THUMBNAIL_TYPES.includes(type)) {
    console.error(`Cannot generate thumbnail for item of type ${type}`)
    return
  }

  const thumbnailKey = tapestryKey(item.tapestryId, `item-${itemId}-thumbnail.jpeg`)
  try {
    const thumbnail = await getThumbnail(item)
    if (!thumbnail) {
      return
    }

    await s3Service.putObject(thumbnailKey, thumbnail, 'image/jpeg')

    await prisma.item.update({
      where: { id: itemId },
      data: {
        thumbnail: thumbnailKey,
        thumbnailWidth: item.width,
        thumbnailHeight: item.height,
      },
    })

    await scheduleTapestryThumbnailGeneration(item.tapestryId)
  } catch (error) {
    console.error('Error while generating item thumbnail', error)
  }
}
