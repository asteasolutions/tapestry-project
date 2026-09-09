import z from 'zod/v4'

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

export const OpenverseMediaSchema = z.object({
  id: z.string(),
  url: z.string(),
  thumbnail: z.string().nullable(),
  title: z.string(),
  creator: z.string().nullable(),
  license: z.string(),
})

export const OpenverseMediaTypeSchema = z.enum(['image', 'audio'])

export const OpenverseCollectionQuerySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tag'), tag: z.string() }),
  z.object({ type: z.literal('source'), source: z.string() }),
])

export const WikimediaMediaTypeSchema = z.enum(['image', 'video', 'audio', 'pdf'])

export const WikimediaMediaSchema = z.object({
  id: z.string(),
  url: z.string(),
  thumbnail: z.string().nullable(),
  title: z.string(),
  uploader: z.string().nullable(),
  mediaType: WikimediaMediaTypeSchema,
})

export const WikimediaCollectionQuerySchema = z.object({
  type: z.literal('category'),
  category: z.string(),
})

const ExternalMediaQuerySchema = z.discriminatedUnion('platform', [
  z.object({
    platform: z.literal('openverse'),
    mediaType: OpenverseMediaTypeSchema,
    id: z.string(),
  }),
  z.object({ platform: z.literal('wikimedia-commons'), title: z.string() }),
])

const ExternalCollectionQuerySchema = z.discriminatedUnion('platform', [
  z.object({
    platform: z.literal('openverse'),
    mediaType: OpenverseMediaTypeSchema,
    collection: OpenverseCollectionQuerySchema,
  }),
  z.object({
    platform: z.literal('wikimedia-commons'),
    collection: WikimediaCollectionQuerySchema,
  }),
])

const ExternalMediaResultSchema = z.union([OpenverseMediaSchema, WikimediaMediaSchema])

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
    type: z.literal('external-media'),
    result: ExternalMediaResultSchema.nullable(),
  }),
  z.object({
    type: z.literal('external-collection-count'),
    result: z.number().optional(),
  }),
  z.object({
    type: z.literal('external-collection-results'),
    result: z
      .object({
        total: z.number(),
        results: ExternalMediaResultSchema.array(),
      })
      .optional(),
  }),
])

const CreateListWBMSnapshotsProxySchema = z.object({
  type: z.literal('list-wbm-snapshots'),
  url: z.string(),
  limit: z.number().optional(),
})

const CreateFromUrlProxySchema = z.object({
  type: z.enum(['create-wbm-snapshot', 'can-frame', 'ia-user-list', 'content-type']),
  url: z.string(),
})

const CreateExternalMediaProxySchema = z.object({
  type: z.literal('external-media'),
  query: ExternalMediaQuerySchema,
})

const CreateExternalCollectionCountProxySchema = z.object({
  type: z.literal('external-collection-count'),
  query: ExternalCollectionQuerySchema,
})

const CreateExternalCollectionResultsProxySchema = z.object({
  type: z.literal('external-collection-results'),
  query: ExternalCollectionQuerySchema,
  page: z.number(),
  pageSize: z.number(),
})

export const ProxyCreateSchema = z.discriminatedUnion('type', [
  CreateListWBMSnapshotsProxySchema,
  CreateFromUrlProxySchema,
  CreateExternalMediaProxySchema,
  CreateExternalCollectionCountProxySchema,
  CreateExternalCollectionResultsProxySchema,
])
