import { Prisma } from '@prisma/client'
import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { parseListFilter } from './utils.js'
import { serialize } from '../transformers/index.js'
import { BadRequestError, ConflictError } from '../errors/index.js'
import { ownsTapestry } from './tapestries.js'

export const featureRequests: RESTResourceImpl<
  Resources['featureRequests'],
  Prisma.FeatureRequestWhereInput
> = {
  accessPolicy: {
    canCreate: async ({ body: { tapestryId } }, { userId }) => ownsTapestry(tapestryId, userId),
    canList: () => Promise.resolve(true),
    // Owners see the requests for their own tapestries. Admins use the admin endpoint.
    createListFilter: (userId) => ({
      OR: [{ requesterId: userId! }, { tapestry: { ownerId: userId! } }],
    }),
  },

  handlers: {
    create: async ({ body: { tapestryId } }, { userId }) => {
      const request = await prisma.$transaction(
        async (tx) => {
          const tapestry = await tx.tapestry.findUniqueOrThrow({ where: { id: tapestryId } })
          if (tapestry.visibility !== 'link') {
            throw new BadRequestError(
              'Only tapestries shared with anyone with the link can be featured',
            )
          }
          if (tapestry.featured) {
            throw new ConflictError('This tapestry is already featured')
          }

          const pending = await tx.featureRequest.findFirst({
            where: { tapestryId, status: 'pending' },
          })
          if (pending) {
            throw new ConflictError('This tapestry already has a pending feature request')
          }

          return tx.featureRequest.create({
            data: { tapestryId, tapestryTitle: tapestry.title, requesterId: userId },
          })
        },
        // Serializable isolation enforces a single pending request per tapestry
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )

      return serialize('FeatureRequest', request)
    },

    list: async ({ query }, { listFilter }) => {
      const {
        where: whereFilter,
        skip,
        limit,
        orderBy,
      } = parseListFilter<Prisma.FeatureRequestWhereInput>(query)
      const where = { ...whereFilter, ...listFilter }

      const [total, requests] = await Promise.all([
        prisma.featureRequest.count({ where }),
        prisma.featureRequest.findMany({ where, orderBy, skip, take: limit }),
      ])

      return { data: await serialize('FeatureRequest', requests), total, skip }
    },
  },
}
