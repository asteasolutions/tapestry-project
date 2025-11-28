import { RESTResourceImpl } from './base-resource.js'
import { resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { isUniqueConstraintViolation, prisma } from '../db.js'
import { serialize } from '../transformers/index.js'
import { BadRequestError, ForbiddenError } from '../errors/index.js'
import { Prisma } from '@prisma/client'
import { parseIncludes, parseListFilter } from './utils.js'

async function tapestryOwner(id: string, userId: string) {
  return !!(await prisma.tapestryAccess.findUnique({
    where: { id, tapestry: { ownerId: userId } },
  }))
}

export const tapestryAccess: RESTResourceImpl<
  typeof resources.tapestryAccess,
  Prisma.TapestryAccessWhereInput
> = {
  accessPolicy: {
    canCreate: () => Promise.resolve(true),
    canDestroy: ({ pathParams: { id } }, { userId }) => tapestryOwner(id, userId),
    canList: () => Promise.resolve(true),
    canUpdate: ({ pathParams: { id } }, { userId }) => tapestryOwner(id, userId),
    createListFilter: (userId) => ({
      OR: [{ userId: userId! }, { tapestry: { ownerId: userId! } }],
    }),
  },
  handlers: {
    create: async ({ body }, { userId }) => {
      const invitation = await prisma.tapestryInvitation.findUniqueOrThrow({
        where: { id: body.tapestryInvitationId },
        include: { tapestry: true },
      })
      if (invitation.tapestry.ownerId === userId) {
        throw new ForbiddenError('Tapestry owner cannot accept the invitation')
      }
      try {
        const access = await prisma.tapestryAccess.create({
          data: { tapestryId: invitation.tapestryId, canEdit: invitation.canEdit, userId },
        })
        return serialize('TapestryAccess', access)
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          throw new BadRequestError('Invitation already accepted.')
        }
        throw error
      }
    },
    update: async ({ pathParams: { id }, body }) => {
      const access = await prisma.tapestryAccess.update({ where: { id }, data: body })
      return serialize('TapestryAccess', access)
    },
    destroy: async ({ pathParams: { id } }) => {
      await prisma.tapestryAccess.delete({ where: { id } })
    },
    list: async ({ query }, { listFilter }) => {
      const {
        skip,
        limit,
        orderBy,
        where: whereFilter,
      } = parseListFilter<Prisma.TapestryAccessWhereInput>(query)
      const where = { ...whereFilter, ...listFilter }

      const total = await prisma.tapestryAccess.count({ where })
      const invitations = await prisma.tapestryAccess.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: parseIncludes('TapestryAccess', query.include),
      })

      return Promise.resolve({
        data: await serialize('TapestryAccess', invitations),
        skip,
        total,
      })
    },
  },
}
