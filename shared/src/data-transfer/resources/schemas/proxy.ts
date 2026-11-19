import z from 'zod/v4'
import { SizeSchema } from 'tapestry-core/src/data-format/schemas/common.js'
import { GOOGLE_DRIVE_WEBPAGE_TYPES } from 'tapestry-core/src/data-format/schemas/item.js'

export const WBMSnapshotSchema = z.object({
  urlkey: z.string(),
  timestamp: z.string(),
  original: z.string(),
  mimetype: z.string(),
  statuscode: z.string(),
  digest: z.string(),
  length: z.string(),
})

export const UserListResponseSchema = z.object({
  success: z.boolean(),
  value: z.object({
    list_name: z.string(),
    description: z.string(),
    is_private: z.boolean(),
    id: z.number(),
    date_created: z.string(),
    date_updated: z.string(),
    members: z
      .object({
        identifier: z.string(),
        member_id: z.number(),
        date_added: z.string(),
      })
      .array(),
  }),
})

export const ProxySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('list-wbm-snapshots'),
    result: WBMSnapshotSchema.array(),
  }),
  z.object({
    type: z.literal('create-wbm-snapshot'),
    result: z.literal(true),
  }),
  z.object({
    type: z.literal('can-frame'),
    result: z.boolean(),
  }),
  z.object({
    type: z.literal('ia-user-list'),
    result: UserListResponseSchema,
  }),
  z.object({
    type: z.literal('content-type'),
    result: z.string(),
  }),
  z.object({
    type: z.literal('google-drive-metadata'),
    result: z.object({
      webpageType: z.enum(GOOGLE_DRIVE_WEBPAGE_TYPES),
      size: SizeSchema.nullable(),
    }),
  }),
])

const CreateListWBMSnapshotsProxySchema = z.object({
  type: z.literal('list-wbm-snapshots'),
  url: z.string(),
  limit: z.number().optional(),
})

const CreateFromUrlProxySchema = z.object({
  type: z.enum([
    'create-wbm-snapshot',
    'can-frame',
    'ia-user-list',
    'content-type',
    'google-drive-metadata',
  ]),
  url: z.string(),
})

export const ProxyCreateSchema = z.discriminatedUnion('type', [
  CreateListWBMSnapshotsProxySchema,
  CreateFromUrlProxySchema,
])
