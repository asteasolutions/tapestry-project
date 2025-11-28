import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { canEditTapestry, canListTapestryElements, canViewTapestry } from './tapestries.js'
import { parseIncludes, parseListFilter } from './utils.js'
import { serialize } from '../transformers/index.js'
import { commentDtoToDb } from '../transformers/comment.js'
import { BadRequestError } from '../errors/index.js'
import { Prisma } from '@prisma/client'

async function canViewComment(userId: string | null, commentId: string) {
  const comment = await prisma.comment.findUniqueOrThrow({
    where: { id: commentId },
  })
  return canViewTapestry(userId, comment.tapestryId)
}

async function canEditComment(userId: string | null, commentId: string) {
  const comment = await prisma.comment.findUniqueOrThrow({ where: { id: commentId } })
  return !comment.deletedAt && userId === comment.authorId
}

async function canDeleteComment(userId: string | null, commentId: string) {
  const comment = await prisma.comment.findUniqueOrThrow({ where: { id: commentId } })
  return (
    !comment.deletedAt &&
    (userId === comment.authorId || (await canEditTapestry(userId, comment.tapestryId)))
  )
}

export const comments: RESTResourceImpl<Resources['comments'], never> = {
  accessPolicy: {
    canCreate: ({ body }, { userId }) => canViewTapestry(userId, body.tapestryId),
    canRead: ({ pathParams: { id } }, { userId }) => canViewComment(userId, id),
    canUpdate: ({ pathParams: { id } }, { userId }) => canEditComment(userId, id),
    canDestroy: ({ pathParams: { id } }, { userId }) => canDeleteComment(userId, id),
    canList: ({ query: { filter } }, { userId }) => canListTapestryElements(filter, userId),
  },

  handlers: {
    create: async ({ body, query }, { userId }) => {
      if (body.contextType === 'tapestry' && body.contextId !== body.tapestryId) {
        throw new BadRequestError()
      }

      const dbComment = await prisma.comment.create({
        data: {
          ...commentDtoToDb(body, ['id', 'createdAt', 'updatedAt', 'authorId']),
          authorId: userId,
        },
        include: parseIncludes('Comment', query.include),
      })

      return serialize('Comment', dbComment)
    },

    read: async ({ pathParams: { id }, query }) => {
      const dbComment = await prisma.comment.findUniqueOrThrow({
        where: { id },
        include: parseIncludes('Comment', query.include),
      })
      return serialize('Comment', dbComment)
    },

    update: async ({ pathParams: { id }, body, query }) => {
      const dbComment = await prisma.comment.update({
        where: { id },
        data: body,
        include: parseIncludes('Comment', query.include),
      })

      return serialize('Comment', dbComment)
    },

    destroy: async ({ pathParams: { id } }) => {
      await prisma.comment.update({ where: { id }, data: { deletedAt: new Date(), text: '' } })
    },

    list: async ({ query }) => {
      const filter = parseListFilter<Prisma.CommentWhereInput>(query)
      const where = filter.where
      const total = await prisma.comment.count({ where })
      const comments = await prisma.comment.findMany({
        where,
        include: parseIncludes('Comment', query.include),
        orderBy: filter.orderBy,
        skip: filter.skip,
        take: filter.limit,
      })
      return {
        data: await serialize('Comment', comments),
        total,
        skip: filter.skip,
      }
    },
  },
}
