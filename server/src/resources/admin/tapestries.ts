import { Prisma } from '@prisma/client'
import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../../db.js'
import { RESTResourceImpl } from '../base-resource.js'
import { parseListFilter } from '../utils.js'
import { adminOnly } from '../../auth/roles.js'
import {
  adminTapestryDbToDto,
  adminTapestryDetailInclude,
  adminTapestryInclude,
} from '../../transformers/admin.js'
import { adminTapestryFilters } from './filters.js'
import {
  deleteTapestryPermanently,
  featureTapestry,
  unfeatureTapestry,
} from '../../services/tapestry-sharing.js'
import { logAdminActivity } from '../../services/admin-activity.js'

type Tx = Prisma.TransactionClient

export async function setFeatured(tx: Tx, adminId: string, id: string, featured: boolean) {
  const tapestry = await tx.tapestry.findUniqueOrThrow({ where: { id } })
  if (tapestry.featured === featured) return

  if (featured) {
    // Fails unless the owner shares the tapestry with anyone with the link
    await featureTapestry(tx, id)
  } else {
    await unfeatureTapestry(tx, id)
  }

  await logAdminActivity(
    adminId,
    {
      action: 'changeFeatured',
      targetType: 'tapestry',
      targetId: id,
      targetLabel: tapestry.title,
      details: { featured },
    },
    tx,
  )
}

export const adminTapestries: RESTResourceImpl<
  Resources['adminTapestries'],
  Prisma.TapestryWhereInput
> = {
  accessPolicy: {
    canRead: adminOnly,
    canUpdate: adminOnly,
    canDestroy: adminOnly,
    canList: adminOnly,
    createListFilter: () => ({}),
  },

  handlers: {
    list: async ({ query }) => {
      const { where, skip, limit, orderBy } = parseListFilter<
        Prisma.TapestryWhereInput,
        keyof typeof adminTapestryFilters
      >({ ...query, orderBy: query.orderBy ?? { updatedAt: 'desc' } }, adminTapestryFilters)

      console.log(where, skip, limit)
      const [total, tapestries] = await Promise.all([
        prisma.tapestry.count({ where }),
        prisma.tapestry.findMany({
          where,
          orderBy: [orderBy, { id: 'asc' }],
          skip,
          take: limit,
          include: adminTapestryInclude,
        }),
      ])

      return { data: await Promise.all(tapestries.map(adminTapestryDbToDto)), total, skip }
    },

    read: async ({ pathParams: { id } }) =>
      adminTapestryDbToDto(
        await prisma.tapestry.findUniqueOrThrow({
          where: { id },
          include: adminTapestryDetailInclude,
        }),
      ),

    // Admins can only feature or unfeature tapestries. Sharing is changed by owners only.
    update: async ({ pathParams: { id }, body: { featured } }, { userId }) => {
      await prisma.$transaction((tx) => setFeatured(tx, userId, id, featured))

      return adminTapestryDbToDto(
        await prisma.tapestry.findUniqueOrThrow({
          where: { id },
          include: adminTapestryDetailInclude,
        }),
      )
    },

    destroy: async ({ pathParams: { id } }, { userId }) => {
      await deleteTapestryPermanently(id, userId, true, (tx, tapestry) =>
        logAdminActivity(
          userId,
          {
            action: 'deleteTapestry',
            targetType: 'tapestry',
            targetId: id,
            targetLabel: tapestry.title,
            details: { itemCount: tapestry.itemCount },
          },
          tx,
        ),
      )
    },
  },
}
