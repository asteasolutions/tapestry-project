import z from 'zod/v4'
import { BaseResourceSchema, ListFilterSchema } from './common.js'
import { UserSchema } from './user.js'
import { USER_ROLES } from '../dtos/user.js'
import { TAPESTRY_VISIBILITIES } from '../dtos/tapestry.js'
import {
  ADMIN_ACTIONS,
  ADMIN_ACTIVITY_TARGET_TYPES,
  REPORT_COMPARISONS,
  REPORT_METRICS,
  SHARING_LEVELS,
} from '../dtos/admin.js'

// ---- Users ----

export const AdminUserSchema = UserSchema.extend({
  gsiUserId: z.string().nullable(),
  orcidId: z.string().nullable(),
  wikimediaId: z.string().nullable(),
  blueskyDid: z.string().nullable(),
  tapestryCount: z.number().int().nonnegative(),
}).describe('A user as seen by admins, including every stored identifier.')

export const AdminUserUpdateSchema = z.object({
  role: z.enum(USER_ROLES),
})

// ---- Tapestries ----

export const AdminTapestryAccessSchema = z.object({
  id: z.string(),
  userId: z.string(),
  canEdit: z.boolean(),
  user: AdminUserSchema,
})

export const AdminTapestryParentSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  ownerUsername: z.string(),
})

export const AdminTapestrySchema = BaseResourceSchema.extend({
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnail: z.string().nullable(),
  visibility: z.enum(TAPESTRY_VISIBILITIES),
  sharingLevel: z.enum(SHARING_LEVELS),
  featured: z.boolean(),
  featuredAt: z.coerce.date<Date>().nullable(),
  galleryPosition: z.number().int().nullable(),
  itemCount: z.number().int().nonnegative(),
  invitedCount: z.number().int().nonnegative(),
  parentId: z.string().nullable(),
  ownerId: z.string(),
  owner: AdminUserSchema,
  userAccess: AdminTapestryAccessSchema.array().nullish(),
  parent: AdminTapestryParentSchema.nullish(),
}).describe('A tapestry as seen by admins.')

export const AdminTapestryUpdateSchema = z.object({
  featured: z.boolean(),
})

// ---- Activity log ----

export const AdminActivitySchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date<Date>(),
  adminId: z.string().nullable(),
  adminUsername: z.string(),
  action: z.enum(ADMIN_ACTIONS),
  targetType: z.enum(ADMIN_ACTIVITY_TARGET_TYPES),
  targetId: z.string().nullable(),
  targetLabel: z.string().nullable(),
  details: z.record(z.string(), z.unknown()).nullable(),
})

export const AdminActivityCreateSchema = z
  .discriminatedUnion('action', [
    z.object({
      action: z.literal('deleteItems'),
      tapestryId: z.string(),
      itemIds: z.string().array().min(1),
    }),
    z.object({
      action: z.literal('reorderGallery'),
      tapestryIds: z.string().array(),
      removedTapestryIds: z.string().array().optional(),
    }),
  ])
  .describe(
    'Performs an admin action and records it in the activity log. Only actions without a ' +
      'resource of their own can be created directly.',
  )

// ---- Reports ----

export const ReportQueryCreateSchema = z.object({
  metric: z.enum(REPORT_METRICS),
  from: z.coerce.date<Date>().nullable(),
  to: z.coerce.date<Date>(),
  compare: z.enum(REPORT_COMPARISONS),
})

const ReportUnitSchema = z.enum(['count', 'percent', 'days'])

const DrillTargetSchema = z.object({
  kind: z.enum(['users', 'tapestries']),
  filter: ListFilterSchema,
})

const ReportDataSchema = z.object({
  from: z.coerce.date<Date>().nullable(),
  to: z.coerce.date<Date>(),
  figures: z
    .object({
      key: z.string(),
      label: z.string(),
      value: z.number().nullable(),
      unit: ReportUnitSchema,
      drill: DrillTargetSchema.nullable(),
    })
    .array(),
  tables: z
    .object({
      key: z.string(),
      title: z.string(),
      columns: z.object({ key: z.string(), label: z.string(), unit: ReportUnitSchema }).array(),
      rows: z
        .object({
          key: z.string(),
          label: z.string(),
          values: z.number().nullable().array(),
          drill: DrillTargetSchema.nullable().array().nullable(),
        })
        .array(),
    })
    .array(),
})

export const ReportSchema = z.object({
  metric: z.enum(REPORT_METRICS),
  title: z.string(),
  dataStatus: z.enum(['available', 'partial']),
  limitations: z.string().nullable(),
  isCurrentState: z.boolean(),
  current: ReportDataSchema,
  comparison: ReportDataSchema.nullable(),
})
