import { Prisma } from '@prisma/client'
import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import {
  DeleteItemsCommandDto,
  ReorderGalleryCommandDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin.js'
import { prisma } from '../../db.js'
import { RequestContext, RESTResourceImpl } from '../base-resource.js'
import { parseListFilter } from '../utils.js'
import { adminOnly } from '../../auth/roles.js'
import { serialize } from '../../transformers/index.js'
import { BadRequestError, ConflictError, ForbiddenError } from '../../errors/index.js'
import { logAdminActivity } from '../../services/admin-activity.js'
import { destroyItems } from '../items.js'
import { unfeatureTapestry } from '../../services/tapestry-sharing.js'

type Tx = Prisma.TransactionClient

/**
 * Permanently deletes selected items. Their presentation steps are removed first, since the schema
 * does not allow deleting items that are used in a presentation.
 */
async function deleteItems(
  tx: Tx,
  { tapestryId, itemIds }: DeleteItemsCommandDto,
  context: RequestContext<true>,
) {
  const ids = [...new Set(itemIds)]

  const tapestry = await tx.tapestry.findUniqueOrThrow({ where: { id: tapestryId } })
  // Admin moderation applies only to tapestries shared with anyone with the link. For private ones
  // the admin owns or was invited to, they have only their normal access.
  if (tapestry.visibility !== 'link') {
    throw new ForbiddenError(
      'Only items of tapestries shared with anyone with the link can be deleted',
    )
  }
  const items = await tx.item.findMany({
    where: { id: { in: ids }, tapestryId },
    select: { id: true, type: true, title: true },
  })
  if (items.length !== ids.length) {
    throw new BadRequestError('Some of the items do not belong to this tapestry')
  }

  await destroyItems(ids, context, tx)

  return logAdminActivity(
    context.userId,
    {
      action: 'deleteItems',
      targetType: 'tapestry',
      targetId: tapestryId,
      targetLabel: tapestry.title,
      details: {
        items: items.map((item) => ({ id: item.id, type: item.type, title: item.title })),
      },
    },
    tx,
  )
}

/**
 * Publishes the Gallery: removes the given tapestries from it and saves the order of the rest.
 * Together, the two lists must contain exactly the featured tapestries, so that changes made by
 * another admin in the meantime are never overwritten.
 */
async function reorderGallery(
  tx: Tx,
  { tapestryIds, removedTapestryIds = [] }: ReorderGalleryCommandDto,
  adminId: string,
) {
  const featured = await tx.tapestry.findMany({
    where: { featured: true },
    select: { id: true, title: true },
  })
  const featuredIds = new Set(featured.map((t) => t.id))
  const allIds = [...tapestryIds, ...removedTapestryIds]
  if (
    new Set(allIds).size !== allIds.length ||
    featuredIds.size !== allIds.length ||
    !allIds.every((id) => featuredIds.has(id))
  ) {
    throw new ConflictError('The Gallery has changed. Reload it and try again.')
  }

  for (const id of removedTapestryIds) {
    await unfeatureTapestry(tx, id)
    await logAdminActivity(
      adminId,
      {
        action: 'changeFeatured',
        targetType: 'tapestry',
        targetId: id,
        targetLabel: featured.find((t) => t.id === id)?.title,
        details: { featured: false },
      },
      tx,
    )
  }

  // Raw SQL leaves "updatedAt" untouched, so reordering does not change what users see as the
  // "last updated" date.
  await tx.$executeRaw`
    UPDATE "Tapestry" AS t
    SET "galleryPosition" = (o.position - 1)::INTEGER
    FROM unnest(${tapestryIds}::TEXT[]) WITH ORDINALITY AS o(id, position)
    WHERE t."id" = o.id
  `

  return logAdminActivity(
    adminId,
    {
      action: 'reorderGallery',
      targetType: 'gallery',
      details: { tapestryIds, removedTapestryIds },
    },
    tx,
  )
}

// The activity log is append-only. Creating an entry performs the admin action it describes; every
// other entry is written by the server as a side effect of the corresponding endpoint.
export const adminActivity: RESTResourceImpl<
  Resources['adminActivity'],
  Prisma.AdminActivityWhereInput
> = {
  accessPolicy: {
    canCreate: adminOnly,
    canList: adminOnly,
    createListFilter: () => ({}),
  },

  handlers: {
    create: async ({ body }, context) => {
      // The action and its log entry are written in one transaction, so a failed action leaves
      // no entry behind.
      const entry = await prisma.$transaction(async (tx) => {
        switch (body.action) {
          case 'deleteItems':
            return deleteItems(tx, body, context)
          case 'reorderGallery':
            return reorderGallery(tx, body, context.userId)
          default: {
            const unsupported: never = body
            throw new BadRequestError(`Unsupported action ${JSON.stringify(unsupported)}`)
          }
        }
      })

      return serialize('AdminActivity', entry)
    },

    list: async ({ query }) => {
      const { where, skip, limit, orderBy } = parseListFilter<Prisma.AdminActivityWhereInput>(query)

      const [total, entries] = await Promise.all([
        prisma.adminActivity.count({ where }),
        prisma.adminActivity.findMany({
          where,
          orderBy: [orderBy, { id: 'asc' }],
          skip,
          take: limit,
        }),
      ])

      return { data: await serialize('AdminActivity', entries), total, skip }
    },
  },
}
