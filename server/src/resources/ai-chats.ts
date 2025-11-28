import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { canViewTapestry } from './tapestries.js'
import { parseIncludes, parseListFilter } from './utils.js'
import { serialize } from '../transformers/index.js'
import { AiChat, Prisma } from '@prisma/client'
import { ConflictError } from '../errors/index.js'

export async function isAIChatOwner(userId: string, aiChatOrId: AiChat | string) {
  const aiChat =
    typeof aiChatOrId === 'string'
      ? await prisma.aiChat.findUnique({ where: { id: aiChatOrId } })
      : aiChatOrId
  return aiChat?.userId === userId
}

export const aiChats: RESTResourceImpl<Resources['aiChats'], Prisma.AiChatWhereInput> = {
  accessPolicy: {
    canCreate: async ({ body: { tapestryId } }, { userId }) =>
      !tapestryId || (await canViewTapestry(userId, tapestryId)),
    canRead: ({ pathParams: { id } }, { userId }) => isAIChatOwner(userId, id),
    canDestroy: ({ pathParams: { id } }, { userId }) => isAIChatOwner(userId, id),
    canList: () => Promise.resolve(true),
    createListFilter: (userId: string | null) => ({ userId: userId! }),
  },

  handlers: {
    create: async ({ body, query }, { userId }) => {
      // Deny chat creation if the user doesn't have a valid API key
      const apiKey = await prisma.userSecret.findFirst({
        where: { ownerId: userId, type: `${body.aiProvider}ApiKey` },
      })
      if (!apiKey) {
        throw new ConflictError('No API key found for the specified provider')
      }

      const dbAIChat = await prisma.aiChat.create({
        data: { ...body, userId },
        include: parseIncludes('AiChat', query.include),
      })

      return serialize('AiChat', dbAIChat)
    },

    read: async ({ pathParams: { id }, query }) => {
      const dbAIChat = await prisma.aiChat.findUniqueOrThrow({
        where: { id },
        include: parseIncludes('AiChat', query.include),
      })

      return serialize('AiChat', dbAIChat)
    },

    destroy: async ({ pathParams: { id } }) => {
      await prisma.aiChat.delete({ where: { id } })
    },

    list: async ({ query }) => {
      const filter = parseListFilter<Prisma.AiChatWhereInput>(query)
      const where = filter.where
      const total = await prisma.aiChat.count({ where })
      const aiChats = await prisma.aiChat.findMany({
        where,
        include: parseIncludes('AiChat', query.include),
        orderBy: filter.orderBy,
        skip: filter.skip,
        take: filter.limit,
      })
      return {
        data: await serialize('AiChat', aiChats),
        total,
        skip: filter.skip,
      }
    },
  },
}
