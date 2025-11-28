import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { RESTResourceImpl } from './base-resource.js'
import { prisma } from '../db.js'
import { serialize } from '../transformers/index.js'
import { canViewTapestry } from './tapestries.js'
import { parseIncludes, parseListFilter } from './utils.js'
import { Prisma } from '@prisma/client'

async function ownsBookmark(userId: string, bookmarkId: string) {
  const bookmark = await prisma.tapestryBookmark.findUniqueOrThrow({ where: { id: bookmarkId } })
  return bookmark.userId === userId
}

export const tapestryBookmarks: RESTResourceImpl<
  Resources['tapestryBookmarks'],
  Prisma.TapestryBookmarkWhereInput
> = {
  accessPolicy: {
    canCreate: ({ body }, { userId }) => canViewTapestry(userId, body.tapestryId),
    canRead: ({ pathParams: { id } }, { userId }) => ownsBookmark(userId, id),
    canDestroy: ({ pathParams: { id } }, { userId }) => ownsBookmark(userId, id),
    canList: () => Promise.resolve(true),
    createListFilter: (userId) => ({
      userId: userId!,
    }),
  },

  handlers: {
    create: async ({ query, body }, { userId }) => {
      const bookmark = await prisma.tapestryBookmark.create({
        data: {
          ...body,
          userId,
        },
        include: parseIncludes('TapestryBookmark', query.include),
      })

      return serialize('TapestryBookmark', bookmark)
    },

    read: async ({ query, pathParams: { id } }) => {
      const bookmark = await prisma.tapestryBookmark.findUniqueOrThrow({
        where: { id },
        include: parseIncludes('TapestryBookmark', query.include),
      })
      return serialize('TapestryBookmark', bookmark)
    },

    destroy: async ({ pathParams: { id } }) => {
      await prisma.tapestryBookmark.delete({ where: { id } })
    },

    list: async ({ query }, { listFilter }) => {
      const filter = parseListFilter<Prisma.TapestryBookmarkWhereInput>(query)
      const where = { AND: [filter.where, listFilter] }
      const total = await prisma.tapestryBookmark.count({ where })
      const tapestryBookmarks = await prisma.tapestryBookmark.findMany({
        where,
        include: parseIncludes('TapestryBookmark', query.include),
        orderBy: filter.orderBy,
        skip: filter.skip,
        take: filter.limit,
      })
      return {
        data: await serialize('TapestryBookmark', tapestryBookmarks),
        total,
        skip: filter.skip,
      }
    },
  },
}
