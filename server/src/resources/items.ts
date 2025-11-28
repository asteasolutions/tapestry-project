import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { ensureTransaction, prisma } from '../db.js'
import { RequestContext, RESTResourceImpl } from './base-resource.js'
import { itemDtoToDb } from '../transformers/item.js'
import {
  canEditTapestry,
  canListTapestryElements,
  canViewTapestry,
  scheduleTapestryThumbnailGeneration,
} from './tapestries.js'
import { parseIncludes, parseListFilter } from './utils.js'
import { serialize } from '../transformers/index.js'
import { Item, Prisma } from '@prisma/client'
import { queue } from '../tasks/index.js'
import { config } from '../config.js'
import { BadRequestError } from '../errors/index.js'
import { destroyPresentationSteps } from './presentation-steps.js'
import {
  ItemCreateDto,
  ItemDto,
  ItemUpdateDto,
  MediaItemUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/item.js'
import { ReadParamsDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common.js'
import { ensureArray, OneOrMore } from 'tapestry-core/src/utils.js'
import { socketIdFromRequest, socketServer } from '../socket/index.js'
import { groupBy } from 'lodash-es'
import { findWebSourceParser } from 'tapestry-core/src/web-sources/index.js'
import { MEDIA_ITEM_TYPES } from 'tapestry-core/src/data-format/schemas/item.js'

export function shouldRegenerateItemThumbnail(item: Item, patch?: Partial<Item>) {
  if (item.type === 'pdf') return !item.thumbnail || patch?.defaultPage !== undefined
  if (item.type === 'video') return !item.thumbnail || patch?.startTime !== undefined

  // Generate thumbnails only for webpage items.
  if (item.type !== 'webpage') return false

  // If an item has just been created, generate a thumbnail only if it wasn't created with one.
  if (!patch) return !item.thumbnail

  // The item is being updated. If the update contains a thumbnail, skip thumbnail creation.
  if (patch.thumbnail) return false

  // The item is being updated. Generate a thumbnail only if it has been modified in a way
  // which would change the appearance of its thumbnail.
  return (
    (patch.webpageType !== undefined && patch.webpageType !== item.webpageType) ||
    (patch.source !== undefined && patch.source !== item.source) ||
    (patch.width !== undefined && patch.width !== item.thumbnailWidth) ||
    (patch.height !== undefined && patch.height !== item.thumbnailHeight)
  )
}

export function scheduleItemThumbnailGeneration(itemId: string, skipDelay = false) {
  return queue.add(
    'generate-item-thumbnail',
    { itemId },
    {
      jobId: itemId,
      delay: skipDelay ? 0 : config.worker.itemThumbnailGenerationDelay,
      removeOnComplete: true,
      removeOnFail: true,
    },
  )
}

export async function canViewItem(
  userId: string | null,
  itemOrId: Prisma.ItemGetPayload<{ include: { tapestry: true } }> | string,
) {
  const item =
    typeof itemOrId === 'string'
      ? await prisma.item.findUniqueOrThrow({
          where: { id: itemOrId },
          include: { tapestry: true },
        })
      : itemOrId

  return canViewTapestry(userId, item.tapestry)
}

export async function canEditItem(
  userId: string | null,
  itemOrId: Prisma.ItemGetPayload<{ include: { tapestry: true } }> | string,
) {
  const item =
    typeof itemOrId === 'string'
      ? await prisma.item.findUniqueOrThrow({
          where: { id: itemOrId },
          include: { tapestry: true },
        })
      : itemOrId

  return canEditTapestry(userId, item.tapestry)
}

async function resolveWebSource(item: ItemCreateDto | ItemUpdateDto) {
  if (item.type !== 'webpage' || !item.source || item.skipSourceResolution) return

  const webSourceParser = await findWebSourceParser(item.source)

  item.source = webSourceParser.construct(webSourceParser.parse(item.source))
  item.webpageType = webSourceParser.webpageType
}

function isMediaItemUpdate(update: ItemUpdateDto): update is MediaItemUpdateDto {
  return MEDIA_ITEM_TYPES.includes(update.type)
}

export async function createItems(
  item: ItemCreateDto,
  context?: RequestContext<true>,
  query?: ReadParamsDto,
  tx?: Prisma.TransactionClient,
): Promise<ItemDto>
export async function createItems(
  items: ItemCreateDto[],
  context?: RequestContext<true>,
  query?: ReadParamsDto,
  tx?: Prisma.TransactionClient,
): Promise<ItemDto[]>
export async function createItems(
  items: OneOrMore<ItemCreateDto>,
  context?: RequestContext<true>,
  query?: ReadParamsDto,
  tx?: Prisma.TransactionClient,
) {
  // In case the method is called with an array with a single item, we still want to return an array.
  const shouldReturnSingleRecord = !Array.isArray(items)

  items = ensureArray(items)
  await Promise.all(items.map(resolveWebSource))
  const itemData = items.map((item) => itemDtoToDb(item, ['createdAt', 'updatedAt']))

  const dbItems = await (tx ?? prisma).item.createManyAndReturn({
    data: itemData,
    include: parseIncludes('Item', query?.include),
  })

  dbItems
    .filter((dbItem) => shouldRegenerateItemThumbnail(dbItem))
    .forEach((dbItem) => scheduleItemThumbnailGeneration(dbItem.id, true))

  const dtos = await serialize('Item', dbItems)

  for (const id of new Set(dtos.map((d) => d.tapestryId))) {
    socketServer.notifyTapestryUpdate(
      id,
      context ? socketIdFromRequest(context.rawRequest) : undefined,
    )
  }
  return shouldReturnSingleRecord ? dtos[0] : dtos
}

export async function updateItems(
  updates: Record<string, ItemUpdateDto>,
  context: RequestContext<true>,
  query?: ReadParamsDto,
  tx?: Prisma.TransactionClient,
) {
  const updatedTapestries = new Set<string>()
  const items = await ensureTransaction(tx, (tx) =>
    Promise.all(
      Object.entries(updates).map(async ([id, update]) => {
        let dbItem = await tx.item.findUniqueOrThrow({ where: { id } })

        if (dbItem.type !== update.type) {
          throw new BadRequestError('Item type cannot be changed')
        }

        if (isMediaItemUpdate(update) && update.source && dbItem.source !== update.source) {
          await resolveWebSource(update)
        }

        const patch = itemDtoToDb(update, ['id', 'createdAt', 'updatedAt'])
        dbItem = await tx.item.update({
          where: { id },
          data: patch,
          include: parseIncludes('Item', query?.include),
        })

        // Even though the item thumbnail generation job schedules a follow up job
        // for generating a tapestry thumbnail we want to schedule a tapestry thumbnail
        // in the cases where for example we move an item (then the item's thumbnail is not regenerated)
        if (shouldRegenerateItemThumbnail(dbItem, patch)) {
          void scheduleItemThumbnailGeneration(id)
        }
        void scheduleTapestryThumbnailGeneration(dbItem.tapestryId)

        updatedTapestries.add(dbItem.tapestryId)

        return serialize('Item', dbItem)
      }),
    ),
  )

  for (const tapestryId of updatedTapestries) {
    socketServer.notifyTapestryUpdate(tapestryId, socketIdFromRequest(context.rawRequest))
  }

  return items
}

export async function destroyItems(
  ids: OneOrMore<string>,
  context: RequestContext<true>,
  tx?: Prisma.TransactionClient,
) {
  return ensureTransaction(tx, async (tx) => {
    ids = ensureArray(ids)
    const presentationSteps = await tx.presentationStep.findMany({ where: { itemId: { in: ids } } })
    await destroyPresentationSteps(
      presentationSteps.map((step) => step.id, tx),
      context,
    )

    const items = await tx.item.findMany({
      where: { id: { in: ids } },
      select: { tapestryId: true, id: true },
    })
    const itemsByTapestry = groupBy(items, (i) => i.tapestryId)

    const payload = await tx.item.deleteMany({ where: { id: { in: ids } } })

    for (const [tapestryId, tapestryItems] of Object.entries(itemsByTapestry)) {
      void scheduleTapestryThumbnailGeneration(tapestryId)
      socketServer.notifyTapestryElementsRemoved(
        {
          ids: tapestryItems.map((r) => r.id),
          modelType: 'items',
          tapestryId,
        },
        socketIdFromRequest(context.rawRequest),
      )
    }

    return payload
  })
}

export const items: RESTResourceImpl<Resources['items'], never> = {
  accessPolicy: {
    canCreate: ({ body: { tapestryId } }, { userId }) => canEditTapestry(userId, tapestryId),
    canRead: ({ pathParams: { id } }, { userId }) => canViewItem(userId, id),
    canUpdate: ({ pathParams: { id } }, { userId }) => canEditItem(userId, id),
    canDestroy: ({ pathParams: { id } }, { userId }) => canEditItem(userId, id),
    canList: ({ query: { filter } }, { userId }) => canListTapestryElements(filter, userId),
  },

  handlers: {
    create: async ({ body, query }, context) => createItems(body, context, query),

    read: async ({ pathParams: { id }, query }) => {
      const dbItem = await prisma.item.findUniqueOrThrow({
        where: { id },
        include: parseIncludes('Item', query.include),
      })

      return serialize('Item', dbItem)
    },

    update: async ({ pathParams: { id }, body, query }, context) =>
      (await updateItems({ [id]: body }, context, query))[0],

    destroy: async ({ pathParams: { id } }, context) => {
      await destroyItems(id, context)
    },

    list: async ({ query }) => {
      const filter = parseListFilter<Prisma.ItemWhereInput>(query)
      const where = filter.where
      const total = await prisma.item.count({ where })
      const items = await prisma.item.findMany({
        where,
        include: parseIncludes('Item', query.include),
        orderBy: filter.orderBy,
        skip: filter.skip,
        take: filter.limit,
      })
      return {
        data: await serialize('Item', items),
        total,
        skip: filter.skip,
      }
    },
  },
}
