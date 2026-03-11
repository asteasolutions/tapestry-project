import { ItemType } from '@prisma/client'
import { prisma } from '../../src/db.js'
import { scheduleTapestryThumbnailGeneration } from '../../src/resources/tapestries.js'

interface Options {
  tapestryId?: string
  ids?: string[]
  types?: ItemType[]
  forceRegenerate?: boolean
}

export async function generateThumbnails({
  tapestryId,
  ids,
  types,
  forceRegenerate,
}: Options = {}) {
  const items = await prisma.item.findMany({
    where: {
      tapestryId,
      ...(ids ? { id: { in: ids } } : {}),
      ...(types ? { type: { in: types } } : {}),
    },
  })

  await prisma.item.updateMany({
    where: { id: { in: items.map((item) => item.id) } },
    data: { scheduledThumbnailProcessing: forceRegenerate ? 'recreate' : 'derive' },
  })

  for (const id of new Set(items.map((item) => item.tapestryId))) {
    await scheduleTapestryThumbnailGeneration(id, { skipDelay: true })
  }
}
