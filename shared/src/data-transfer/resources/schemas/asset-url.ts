import z from 'zod/v4'

export const AssetURLSchema = z.object({
  presignedURL: z.string(),
  key: z.string(),
})

export const TapestryAssetURLCreateSchema = z.object({
  type: z.literal('tapestry-asset'),
  fileExtension: z.string(),
  mimeType: z.string(),
  tapestryId: z.string(),
})

export const ImportAssetURLCreateSchema = z.object({
  type: z.literal('import'),
})

export const AssetURLCreateSchema = z.discriminatedUnion('type', [
  TapestryAssetURLCreateSchema,
  ImportAssetURLCreateSchema,
])
