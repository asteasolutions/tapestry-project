import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { parseIncludes, parseListFilter } from './utils.js'
import { Prisma } from '@prisma/client'
import { serialize } from '../transformers/index.js'

async function ownsInvitation(invitationId: string, userId: string) {
  return !!(await prisma.tapestryInvitation.findUnique({
    where: { id: invitationId, tapestry: { ownerId: userId } },
  }))
}

export const tapestryInvitations: RESTResourceImpl<
  Resources['tapestryInvitations'],
  Prisma.TapestryInvitationWhereInput
> = {
  accessPolicy: {
    canCreate: async ({ body }, { userId }) =>
      !!(await prisma.tapestry.findFirst({ where: { id: body.tapestryId, ownerId: userId } })),
    canRead: () => Promise.resolve(true),
    canDestroy: ({ pathParams: { id } }, { userId }) => ownsInvitation(id, userId),
    canList: () => Promise.resolve(true),
    createListFilter: (userId) => ({
      tapestry: {
        OR: [{ userAccess: { some: { userId: userId!, canEdit: true } } }, { ownerId: userId! }],
      },
    }),
  },

  handlers: {
    create: async ({ body }) => {
      const { tapestryId } = body
      await prisma.tapestryInvitation.deleteMany({ where: { tapestryId } })
      const invitation = await prisma.tapestryInvitation.create({ data: body })
      return serialize('TapestryInvitation', invitation)
    },

    read: async ({ query, pathParams: { id } }) => {
      const invitation = await prisma.tapestryInvitation.findUniqueOrThrow({
        where: { id },
        include: parseIncludes('TapestryInvitation', query.include),
      })
      return serialize('TapestryInvitation', invitation)
    },

    destroy: async ({ pathParams: { id } }) => {
      await prisma.tapestryInvitation.delete({ where: { id } })
    },
    list: async ({ query }, { listFilter }) => {
      const {
        where: whereFilter,
        skip,
        limit,
        orderBy,
      } = parseListFilter<Prisma.TapestryInvitationWhereInput>(query)
      const where = { ...whereFilter, ...listFilter }

      const total = await prisma.tapestryInvitation.count({ where })
      const invitations = await prisma.tapestryInvitation.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: parseIncludes('TapestryInvitation', query.include),
      })

      return Promise.resolve({
        data: await serialize('TapestryInvitation', invitations),
        skip,
        total,
      })
    },
  },
}
