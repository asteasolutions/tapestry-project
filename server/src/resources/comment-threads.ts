import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { canViewTapestry } from './tapestries.js'
import { max } from 'lodash-es'
import { serialize } from '../transformers/index.js'
import { CommentThreadDto } from 'tapestry-shared/src/data-transfer/resources/dtos/comment-threads.js'
import { Prisma } from '@prisma/client'

async function loadCommentThreads<T extends 'tapestry' | 'item' | 'rel'>(
  tapestryId: string,
  contextType: T,
): Promise<(CommentThreadDto & { contextType: T })[]> {
  const idField = `${contextType}Id` as const
  const where: Prisma.CommentWhereInput = {
    deletedAt: null,
    ...(contextType === 'tapestry'
      ? { tapestryId, contextType }
      : { [contextType]: { tapestryId }, contextType }),
  }

  const initialComments = await prisma.comment.findMany({
    distinct: [idField],
    orderBy: { createdAt: 'asc' },
    where,
  })
  const latestComments = await prisma.comment.findMany({
    distinct: [idField],
    orderBy: { updatedAt: 'desc' },
    where,
  })
  const threadSizes = await prisma.comment.groupBy({
    // Here idField has type `${T}Id` which should be essentially the same as 'tapestryId' | 'itemId' | 'relId'.
    // However, the internal typing of Prisma's groupBy method breaks, because for some reason `${T}Id`[] extends
    // never[] but ('tapestryId' | 'itemId' | 'relId')[] doesn't. When we assert the type, it is not entirely
    // precise, but at least it works.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    by: [idField as 'tapestryId' | 'itemId' | 'relId'],
    _count: true,
    where,
  })

  return await Promise.all(
    initialComments.map(
      async (firstComment) =>
        ({
          id: firstComment[idField]!,
          createdAt: firstComment.createdAt,
          updatedAt: latestComments.find((c) => c[idField] === firstComment[idField])!.updatedAt,
          firstComment: await serialize('Comment', firstComment),
          size: threadSizes.find((t) => t[idField] === firstComment[idField])!._count,
          contextType,
          contextId: firstComment[idField]!,
        }) as CommentThreadDto & { contextType: T },
    ),
  )
}

export const commentThreads: RESTResourceImpl<Resources['commentThreads'], never> = {
  accessPolicy: {
    canRead: ({ pathParams: { id } }, { userId }) => canViewTapestry(userId, id),
  },

  handlers: {
    read: async ({ pathParams: { id } }) => {
      const { createdAt } = await prisma.tapestry.findUniqueOrThrow({ where: { id } })

      const tapestryThreads = await loadCommentThreads(id, 'tapestry')
      const itemThreads = await loadCommentThreads(id, 'item')
      const relThreads = await loadCommentThreads(id, 'rel')
      const threads = [...tapestryThreads, ...itemThreads, ...relThreads]

      return {
        id,
        createdAt: createdAt,
        updatedAt: max(threads.map((t) => t.updatedAt)) ?? createdAt,
        threads,
      }
    },
  },
}
