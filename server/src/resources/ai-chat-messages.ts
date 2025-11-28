import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { ensureTransaction, prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { parseIncludes, parseListFilter } from './utils.js'
import { serialize } from '../transformers/index.js'
import { Prisma } from '@prisma/client'
import { isAIChatOwner } from './ai-chats.js'
import { AIChatContext, generateChatMessage } from '../ai/index.js'
import { compact, omit } from 'lodash-es'
import { ConflictError } from '../errors/index.js'
import { FilePart, ImagePart, UserContent, UserModelMessage } from 'ai'
import { parseDBItemSource } from '../transformers/item.js'

async function createAIChatMessage<const T extends Prisma.AiChatMessageCreateArgs>(
  args: Prisma.SelectSubset<T, Prisma.AiChatMessageCreateArgs>,
  tx?: Prisma.TransactionClient,
) {
  return ensureTransaction(tx, async (tx) => {
    const aiMessage = await tx.aiChatMessage.create<T>(args)
    await tx.aiChat.update({
      where: { id: aiMessage.chatId },
      data: { lastMessageAt: aiMessage.createdAt },
    })
    return aiMessage
  })
}

async function serializeItemAttachment(
  attachment: Prisma.AiChatMessageAttachmentGetPayload<{ include: { item: true } }> & {
    type: 'item'
  },
  index: number,
): Promise<Exclude<UserContent, string>> {
  const textParts = [`--- Attachment ${index + 1} ---`, 'Attachment type: tapestry item']
  let filePart: ImagePart | FilePart | undefined
  if (!attachment.item) {
    textParts.push('*Deleted item*')
  } else {
    textParts.push(`Item type: ${attachment.item.type}`)
    if (attachment.item.title) {
      textParts.push(`Item title: ${attachment.item.title}`)
    }
    if (attachment.item.type === 'text') {
      textParts.push(`Text content: ${attachment.item.text}`)
    } else if (attachment.item.type === 'webpage') {
      textParts.push(`Source: ${attachment.item.source!}`)
    } else {
      textParts.push('Source:')
      const { source } = await parseDBItemSource(attachment.item.source!)
      filePart =
        attachment.item.type === 'image'
          ? {
              type: 'image',
              image: new URL(source),
            }
          : {
              type: 'file',
              data: new URL(source),
              mediaType:
                attachment.item.type === 'pdf'
                  ? 'application/pdf'
                  : attachment.item.type === 'book'
                    ? 'application/epub+zip'
                    : // TODO: Figure out how to find correct media type for audio and video items
                      `${attachment.item.type}/*`,
            }
    }
  }
  return compact([{ type: 'text', text: textParts.join('\n\t') }, filePart])
}

export async function serializeMessageForAi(
  message: Prisma.AiChatMessageGetPayload<{
    include: { attachments: { include: { item: true } } }
  }>,
): Promise<UserModelMessage> {
  const content: UserContent = [{ type: 'text', text: message.content }]

  for (const [index, attachment] of message.attachments.entries()) {
    // Remove warning suppression when/if we have other types of attachments
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (attachment.type === 'item') {
      content.push(...(await serializeItemAttachment(attachment, index)))
    }
  }

  return { role: 'user', content }
}

async function processUserMessage(
  message: Prisma.AiChatMessageGetPayload<{
    include: { attachments: { include: { item: true } } }
  }>,
) {
  const chat = await prisma.aiChat.findUniqueOrThrow({
    where: { id: message.chatId },
    include: {
      user: true,
      messages: {
        where: { state: { not: 'error' }, id: { not: message.id } },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { attachments: { include: { item: true } } },
      },
    },
  })

  const context: AIChatContext = {
    userId: chat.user.id,
    userName: chat.user.givenName,
    tapestryId: chat.tapestryId,
    history: await Promise.all(chat.messages.map(serializeMessageForAi).reverse()),
  }

  try {
    const aiResponse = await generateChatMessage(
      chat.aiProvider,
      chat.aiModel,
      context,
      await serializeMessageForAi(message),
    )
    await prisma.$transaction(async (tx) => {
      await createAIChatMessage(
        {
          data: {
            chat: { connect: { id: chat.id } },
            role: 'assistant',
            content: aiResponse,
            state: 'processed',
          },
        },
        tx,
      )
      await tx.aiChatMessage.update({
        where: { id: message.id },
        data: { state: 'processed' },
      })
    })
  } catch (error) {
    console.error(error)
    await prisma.aiChatMessage.update({
      where: { id: message.id },
      data: { state: 'error' },
    })
  }
}

export const aiChatMessages: RESTResourceImpl<
  Resources['aiChatMessages'],
  Prisma.AiChatMessageWhereInput
> = {
  accessPolicy: {
    canCreate: ({ body: { chatId } }, { userId }) => isAIChatOwner(userId, chatId),
    canRead: async ({ pathParams: { id } }, { userId }) => {
      const message = await prisma.aiChatMessage.findUniqueOrThrow({
        where: { id },
        include: { chat: true },
      })
      return isAIChatOwner(userId, message.chat)
    },
    canList: () => Promise.resolve(true),
    createListFilter: (userId: string | null) => ({ chat: { userId: userId! } }),
  },

  handlers: {
    create: async ({ body: { attachments, chatId, ...message }, query }) => {
      const pendingChatMessage = await prisma.aiChatMessage.findFirst({
        where: { chatId: chatId, state: 'pending' },
      })
      if (pendingChatMessage) throw new ConflictError()

      const messageCreateInput: Prisma.AiChatMessageCreateInput = {
        chat: { connect: { id: chatId } },
        content: message.content,
        role: 'user',
        state: 'pending',
      }
      if (attachments) {
        messageCreateInput.attachments = { createMany: { data: attachments } }
      }

      const dbAIChatMessage = await createAIChatMessage({
        data: messageCreateInput,
        include: {
          // Without the cast, TS assumes we've included everything
          ...(parseIncludes('AiChatMessage', query.include) as Record<string, unknown>),
          attachments: { include: { item: true } },
        },
      })

      // TODO: We should probably put this in a background worker, but it should be in a separate Queue from
      // thumbnail generation so that it doesn't get delayed much.
      void processUserMessage(dbAIChatMessage)

      // Before serializing, remove manually included relationships if they are not requested by the client
      const chatMessage = {
        ...dbAIChatMessage,
        attachments: query.include?.includes('attachments')
          ? dbAIChatMessage.attachments.map((attachment) => omit(attachment, 'item'))
          : undefined,
      }
      return serialize('AiChatMessage', chatMessage)
    },

    read: async ({ pathParams: { id }, query }) => {
      const dbAIChatMessage = await prisma.aiChatMessage.findUniqueOrThrow({
        where: { id },
        include: parseIncludes('AiChatMessage', query.include),
      })

      return serialize('AiChatMessage', dbAIChatMessage)
    },

    list: async ({ query }) => {
      const filter = parseListFilter<Prisma.AiChatMessageWhereInput>(query)
      const where = filter.where
      const total = await prisma.aiChatMessage.count({ where })
      const aiChatMessages = await prisma.aiChatMessage.findMany({
        where,
        include: parseIncludes('AiChatMessage', query.include),
        orderBy: filter.orderBy,
        skip: filter.skip,
        take: filter.limit,
      })
      return {
        data: await serialize('AiChatMessage', aiChatMessages),
        total,
        skip: filter.skip,
      }
    },
  },
}
