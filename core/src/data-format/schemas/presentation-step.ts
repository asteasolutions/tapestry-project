import z from 'zod/v4'
import { IdentifiableSchema } from './common.js'

const basePresentationStepProps = {
  ...IdentifiableSchema.shape,
  prevStepId: z.string().nullish(),
}

export const ItemPresentationStepSchema = z.object({
  ...basePresentationStepProps,
  type: z.literal('item'),
  itemId: z.string(),
})

export const GroupPresentationStepSchema = z.object({
  ...basePresentationStepProps,
  type: z.literal('group'),
  groupId: z.string(),
})

export const PresentationStepSchema = z.discriminatedUnion('type', [
  ItemPresentationStepSchema,
  GroupPresentationStepSchema,
])

export type ItemPresentationStep = z.infer<typeof ItemPresentationStepSchema>
export type GroupPresentationStep = z.infer<typeof GroupPresentationStepSchema>
export type PresentationStep = z.infer<typeof PresentationStepSchema>
