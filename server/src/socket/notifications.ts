import { RTCSignalingMessageSchema } from 'tapestry-shared/src/data-transfer/rtc-signaling/types.js'
import z from 'zod/v4'

const modelTypeSchema = z.enum(['items', 'rels', 'groups', 'presentationSteps'])

const BaseDBNotificationSchema = z.object({ socketId: z.string().optional() })

export const TapestryUpdatedNotificationSchema = z.object({
  ...BaseDBNotificationSchema.shape,
  name: z.literal('tapestry-updated'),
  tapestryId: z.string(),
  deletedIds: z.partialRecord(modelTypeSchema, z.string().array()).optional(),
})
export type TapestryUpdatedNotification = z.infer<typeof TapestryUpdatedNotificationSchema>

export const TapestryElementsRemovedNotificationSchema = z.object({
  ...BaseDBNotificationSchema.shape,
  name: z.literal('tapestry-elements-removed'),
  tapestryId: z.string(),
  ids: z.string().array(),
  modelType: modelTypeSchema,
})
export type TapestryElementsRemovedNotification = z.infer<
  typeof TapestryElementsRemovedNotificationSchema
>

export const RTCSignalingMessageNotification = z.object({
  ...BaseDBNotificationSchema.shape,
  message: RTCSignalingMessageSchema,
  name: z.literal('rtc-signaling-message'),
  tapestryId: z.string(),
})

export const DBNotificationSchema = z.discriminatedUnion('name', [
  TapestryUpdatedNotificationSchema,
  TapestryElementsRemovedNotificationSchema,
  RTCSignalingMessageNotification,
])
export type DBNotification = z.infer<typeof DBNotificationSchema>
