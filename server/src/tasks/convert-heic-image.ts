import { unlink, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { noop } from 'lodash-es'
import sharp from 'sharp'
import { isHeicSource } from 'tapestry-core/src/utils'
import { aspectRatio, clampSize } from 'tapestry-core/src/lib/geometry'
import { JobTypeMap } from '.'
import { prisma } from '../db'
import { downloadToTempFile, scheduleTapestryThumbnailGeneration, spawn } from './utils'
import { s3Service, tapestryKey } from '../services/s3-service'
import { DBSubscriber } from '../socket'

const HEIC_CONVERT_QUALITY = 92
const DEFAULT_IMAGE_WIDTH = 300
const MIN_ITEM_SIZE = { width: 100, height: 40 }
const MAX_ITEM_SIZE = { width: 2000, height: 2000 }

export async function convertHeicImage({ itemId }: JobTypeMap['convert-heic-image']) {
  let inputPath = ''
  let outputPath = ''
  try {
    const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId } })

    if (item.type !== 'image' || !item.source || !isHeicSource(item.source)) {
      throw new Error(`HEIC conversion not applicable for item ${itemId}`)
    }

    const sourceUrl = await s3Service.getReadObjectUrl(item.source)
    inputPath = await downloadToTempFile(sourceUrl)
    outputPath = join(tmpdir(), `${randomUUID()}.jpg`)

    await spawn('heif-convert', [
      '--quiet',
      '-q',
      String(HEIC_CONVERT_QUALITY),
      inputPath,
      outputPath,
    ])

    let converted: Buffer
    try {
      converted = await readFile(outputPath)
    } catch {
      throw new Error('heif-convert did not produce a single output image (multi-image HEIC?)')
    }

    const s3Key = tapestryKey(item.tapestryId, `${randomUUID()}.jpg`, true)
    await s3Service.putObject(s3Key, converted, 'image/jpeg')

    const { width: pixelWidth, height: pixelHeight } = await sharp(converted).metadata()
    const size =
      pixelWidth && pixelHeight
        ? clampSize(
            {
              width: DEFAULT_IMAGE_WIDTH,
              height: DEFAULT_IMAGE_WIDTH / aspectRatio({ width: pixelWidth, height: pixelHeight }),
            },
            MIN_ITEM_SIZE,
            MAX_ITEM_SIZE,
          )
        : undefined

    await prisma.item.update({
      where: { id: item.id },
      data: { source: s3Key, scheduledThumbnailProcessing: 'derive', ...size },
    })

    await scheduleTapestryThumbnailGeneration(item.tapestryId, { skipDelay: true })

    await DBSubscriber.fireNotification({
      name: 'tapestry-updated',
      tapestryId: item.tapestryId,
    })
  } catch (error) {
    console.error(`Error while converting HEIC item ${itemId}`, error)
  } finally {
    await Promise.all([
      inputPath ? unlink(inputPath).catch(noop) : undefined,
      outputPath ? unlink(outputPath).catch(noop) : undefined,
    ])
  }
}
