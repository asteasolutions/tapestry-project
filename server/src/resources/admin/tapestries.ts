import { Prisma } from '@prisma/client'
import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { AdminTapestryUpdateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin.js'
import { prisma } from '../../db.js'
import { RESTResourceImpl } from '../base-resource.js'
import { parseListFilter } from '../utils.js'
import { adminOnly } from '../../auth/roles.js'
import {
  adminTapestryDbToDto,
  adminTapestryDetailInclude,
  adminTapestryInclude,
  sharingLevelOf,
} from '../../transformers/admin.js'
import { adminTapestryFilters } from './filters.js'
import { BadRequestError } from '../../errors/index.js'
import {
  deleteTapestryPermanently,
  featureTapestry,
  onSharingRestricted,
  unfeatureTapestry,
} from '../../services/tapestry-sharing.js'
import { logAdminActivity } from '../../services/admin-activity.js'

type Tx = Prisma.TransactionClient

async function changeSharingLevel(
  tx: Tx,
  adminId: string,
  id: string,
  sharingLevel: NonNullable<AdminTapestryUpdateDto['sharingLevel']>,
) {
  const tapestry = await tx.tapestry.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { userAccess: true } } },
  })
  const from = sharingLevelOf(tapestry.visibility, tapestry._count.userAccess)
  if (from === sharingLevel) return

  if (sharingLevel === 'invited' && tapestry._count.userAccess === 0) {
    throw new BadRequestError('Nobody has been invited to this tapestry')
  }

  if (sharingLevel === 'owner') {
    await tx.tapestryAccess.deleteMany({ where: { tapestryId: id } })
    await tx.tapestryInvitation.deleteMany({ where: { tapestryId: id } })
  }

  await tx.tapestry.update({
    where: { id },
    data: {
      visibility: sharingLevel === 'link' ? 'link' : 'private',
      // Admin changes keep the "last updated" date that users see
      updatedAt: tapestry.updatedAt,
    },
  })

  if (sharingLevel !== 'link') {
    await onSharingRestricted(tx, id)
  }

  await logAdminActivity(
    adminId,
    {
      action: 'changeSharing',
      targetType: 'tapestry',
      targetId: id,
      targetLabel: tapestry.title,
      details: { from, to: sharingLevel, wasFeatured: tapestry.featured },
    },
    tx,
  )
}

export async function setFeatured(tx: Tx, adminId: string, id: string, featured: boolean) {
  const tapestry = await tx.tapestry.findUniqueOrThrow({ where: { id } })
  if (tapestry.featured === featured) return

  if (featured) {
    await featureTapestry(tx, id)
    // Featuring a tapestry directly fulfils its pending request, if any
    await tx.featureRequest.updateMany({
      where: { tapestryId: id, status: 'pending' },
      data: { status: 'approved', decidedAt: new Date(), decidedById: adminId },
    })
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
      details: {
        featured,
        ...(featured && tapestry.visibility !== 'link' ? { madeLinkShared: true } : {}),
      },
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

    update: async ({ pathParams: { id }, body }, { userId }) => {
      if (body.featured && body.sharingLevel && body.sharingLevel !== 'link') {
        throw new BadRequestError('Featured tapestries must be shared with anyone with the link')
      }

      await prisma.$transaction(async (tx) => {
        if (body.sharingLevel) {
          await changeSharingLevel(tx, userId, id, body.sharingLevel)
        }
        if (body.featured !== undefined) {
          await setFeatured(tx, userId, id, body.featured)
        }
      })

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
