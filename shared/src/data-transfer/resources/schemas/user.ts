import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'

export const UserSchema = BaseResourceSchema.extend({
  email: z.email(),
  givenName: z.string(),
  familyName: z.string(),
  username: z.string(),
  avatar: z.string().nullish(),
})

export const PublicUserProfileSchema = UserSchema.omit({ email: true })
