import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'

export const UserSchema = BaseResourceSchema.extend({
  email: z.email().nullish(),
  givenName: z.string().nullish(),
  familyName: z.string().nullish(),
  username: z.string(),
  avatar: z.string().nullish(),
})

export const PublicUserProfileSchema = UserSchema.omit({ email: true })
