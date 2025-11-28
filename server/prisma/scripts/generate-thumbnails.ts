import { ItemType } from '@prisma/client'
import { prisma } from '../../src/db.js'
import { scheduleItemThumbnailGeneration } from '../../src/resources/items.js'

interface Options {
  tapestryId?: string
  ids?: string[]
  types?: ItemType[]
}

export async function generateThumbnails({ tapestryId, ids, types }: Options = {}) {
  const items = await prisma.item.findMany({
    where: {
      tapestryId,
      ...(ids ? { id: { in: ids } } : {}),
      ...(types ? { type: { in: types } } : {}),
    },
  })
  for (const item of items) {
    await scheduleItemThumbnailGeneration(item.id, true)
  }
}
