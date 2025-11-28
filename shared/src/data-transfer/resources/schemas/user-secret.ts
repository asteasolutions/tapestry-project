import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { baseResourcePropsMask } from '../types.js'
import { AIChatProviderSchema } from './ai-chat.js'
import { UserSecretType } from '../dtos/user-secret.js'

export const UserSecretTypeSchema = z.enum(
  AIChatProviderSchema.options.map((provider) => `${provider}ApiKey` as UserSecretType),
)

export const UserSecretSchema = z.object({
  ...BaseResourceSchema.shape,
  type: UserSecretTypeSchema,
  maskedValue: z.string(),
  ownerId: z.string(),
})

export const UserSecretCreateSchema = z.object({
  ...UserSecretSchema.omit({ ...baseResourcePropsMask, maskedValue: true }).shape,
  value: z.string(),
})

export const UserSecretUpdateSchema = UserSecretCreateSchema.omit({ ownerId: true }).partial()
