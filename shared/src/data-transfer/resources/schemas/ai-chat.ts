import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { baseResourcePropsMask } from '../types.js'
import { PublicUserProfileSchema } from './user.js'
import { TapestrySchema } from './tapestry.js'

export const AIChatParticipantRoleSchema = z.enum(['user', 'assistant'])
export const AIChatProviderSchema = z.enum(['google'])
export const AIChatMessageStateSchema = z.enum(['pending', 'processed', 'error'])

export const AIChatSchema = BaseResourceSchema.extend({
  userId: z.string(),
  aiProvider: AIChatProviderSchema,
  aiModel: z.string(),
  tapestryId: z.string().nullish(),
  user: PublicUserProfileSchema.nullish(),
  tapestry: TapestrySchema.nullish(),
})

const AIChatMessageItemAttachmentSchema = z.object({
  type: z.literal('item'),
  itemId: z.string(),
})

const AIChatMessageAttachmentSchema = z.discriminatedUnion('type', [
  AIChatMessageItemAttachmentSchema,
])

export const AIChatMessageSchema = BaseResourceSchema.extend({
  chatId: z.string(),
  role: AIChatParticipantRoleSchema,
  content: z.string(),
  chat: AIChatSchema.nullish(),
  state: AIChatMessageStateSchema,
  attachments: AIChatMessageAttachmentSchema.array().nullish(),
})

export const AIChatCreateSchema = AIChatSchema.omit({
  ...baseResourcePropsMask,
  user: true,
  tapestry: true,
  userId: true,
})

export const AIChatMessageCreateSchema = AIChatMessageSchema.omit({
  ...baseResourcePropsMask,
  chat: true,
  role: true,
  state: true,
})
