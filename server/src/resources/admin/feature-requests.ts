import { Prisma } from '@prisma/client'
import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../../db.js'
import { RESTResourceImpl } from '../base-resource.js'
import { parseListFilter } from '../utils.js'
import { adminOnly } from '../../auth/roles.js'
import { ConflictError } from '../../errors/index.js'
import { adminFeatureRequestDbToDto, adminFeatureRequestInclude } from '../../transformers/admin.js'
import { featureTapestry } from '../../services/tapestry-sharing.js'
import { logAdminActivity } from '../../services/admin-activity.js'

export const adminFeatureRequests: RESTResourceImpl<
  Resources['adminFeatureRequests'],
  Prisma.FeatureRequestWhereInput
> = {
  accessPolicy: {
    canUpdate: adminOnly,
    canList: adminOnly,
    createListFilter: () => ({}),
  },

  handlers: {
    list: async ({ query }) => {
      // Requests are processed oldest first
      const { where, skip, limit, orderBy } = parseListFilter<Prisma.FeatureRequestWhereInput>({
        ...query,
        orderBy: query.orderBy ?? { createdAt: 'asc' },
      })

      const [total, requests] = await Promise.all([
        prisma.featureRequest.count({ where }),
        prisma.featureRequest.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: adminFeatureRequestInclude,
        }),
      ])

      return { data: await Promise.all(requests.map(adminFeatureRequestDbToDto)), total, skip }
    },

    update: async ({ pathParams: { id }, body: { status } }, { userId }) => {
      await prisma.$transaction(async (tx) => {
        const request = await tx.featureRequest.findUniqueOrThrow({ where: { id } })
        if (request.status !== 'pending') {
          throw new ConflictError('This request has already been closed')
        }

        if (status === 'approved') {
          if (!request.tapestryId) {
            throw new ConflictError('The tapestry no longer exists')
          }
          await featureTapestry(tx, request.tapestryId)
        }

        await tx.featureRequest.update({
          where: { id },
          data: { status, decidedAt: new Date(), decidedById: userId },
        })

        await logAdminActivity(
          userId,
          {
            action: status === 'approved' ? 'approveFeatureRequest' : 'declineFeatureRequest',
            targetType: 'featureRequest',
            targetId: id,
            targetLabel: request.tapestryTitle,
            details: { tapestryId: request.tapestryId },
          },
          tx,
        )
      })

      return adminFeatureRequestDbToDto(
        await prisma.featureRequest.findUniqueOrThrow({
          where: { id },
          include: adminFeatureRequestInclude,
        }),
      )
    },
  },
}
