import { Prisma } from '@prisma/client'
import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma, Tx } from '../../db.js'
import { RESTResourceImpl } from '../base-resource.js'
import { parseListFilter } from '../utils.js'
import { adminOnly, isAdmin } from '../../auth/roles.js'
import { canViewTapestry } from '../tapestries.js'
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

/**
 * The tapestries an admin may see in the admin panel: those shared with anyone with the link, plus
 * private ones the admin owns or was invited to. This is the list counterpart of `canViewTapestry`.
 */
function adminVisibleTapestries(adminId: string): Prisma.TapestryWhereInput {
  return {
    OR: [
      { visibility: 'link' },
      { ownerId: adminId },
      { userAccess: { some: { userId: adminId } } },
    ],
  }
}

/** Admins have no extra access to tapestries: they manage only the ones they can view. */
const canManageTapestry = async (
  { pathParams: { id } }: { pathParams: { id: string } },
  { userId }: { userId: string | null },
) => (await isAdmin(userId)) && canViewTapestry(userId, id)

async function setFeatured(tx: Tx, adminId: string, id: string, featured: boolean) {
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
    canRead: canManageTapestry,
    canUpdate: canManageTapestry,
    canDestroy: canManageTapestry,
    canList: adminOnly,
    createListFilter: (userId) => adminVisibleTapestries(userId!),
  },

  handlers: {
    list: async ({ query }, { listFilter }) => {
      const {
        where: filter,
        skip,
        limit,
        orderBy,
      } = parseListFilter<Prisma.TapestryWhereInput, keyof typeof adminTapestryFilters>(
        { ...query, orderBy: query.orderBy ?? { updatedAt: 'desc' } },
        adminTapestryFilters,
      )
      const where: Prisma.TapestryWhereInput = { AND: [filter, listFilter] }

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
