import { s3Service } from '../services/s3-service.js'
import { prisma } from '../db.js'
import { compact } from 'lodash-es'

const ONE_DAY = 24 * 60 * 60 * 1000

const PERSISTED_KEYS: string[] = []

export async function s3Cleanup() {
  try {
    const thumbnails = await prisma.tapestry.findMany({
      select: { thumbnail: true },
      where: { thumbnail: { not: null } },
    })
    const items = await prisma.item.findMany({
      select: { source: true, thumbnail: true, customThumbnail: true },
      where: {
        OR: [
          { source: { not: null } },
          { thumbnail: { not: null } },
          { customThumbnail: { not: null } },
        ],
      },
    })

    const allS3Keys = new Set([
      ...thumbnails.map((t) => t.thumbnail!),
      ...compact(items.map((i) => i.source)),
      ...compact(items.map((i) => i.thumbnail)),
      ...compact(items.map((i) => i.customThumbnail)),
      ...PERSISTED_KEYS,
    ])

    for await (const batch of s3Service.listBucket()) {
      const toRemove = (batch ?? []).reduce<string[]>((acc, { Key, LastModified }) => {
        const wasUpdatedSoon = LastModified && Date.now() - LastModified.getTime() < ONE_DAY
        if (Key && !allS3Keys.has(Key) && !wasUpdatedSoon) {
          acc.push(Key)
        }
        return acc
      }, [])

      console.info(`Clean up job removing ${toRemove.join(', ')}`)

      await s3Service.deleteObjects(toRemove)
    }
  } catch (e) {
    console.warn('Error cleaning up s3', e)
  }
}
