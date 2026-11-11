import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { USER_ROLES } from '../dtos/user.js'

export const UserSchema = BaseResourceSchema.extend({
  email: z.email().nullish(),
  givenName: z.string().nullish(),
  familyName: z.string().nullish(),
  username: z.string(),
  avatar: z.string().nullish(),
  role: z.enum(USER_ROLES),
})

export const PublicUserProfileSchema = UserSchema.omit({ email: true, role: true })
