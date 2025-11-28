import z from 'zod/v4'
import { ItemSchema } from './item.js'
import { BaseResourceSchema } from './common.js'
import { baseResourcePropsMask } from '../types.js'
import { GroupSchema } from './group.js'
import {
  ItemPresentationStepSchema as BaseItemPresentationStepSchema,
  GroupPresentationStepSchema as BaseGroupPresentationStepSchema,
} from 'tapestry-core/src/data-format/schemas/presentation-step.js'

export const ItemPresentationStepSchema = z.object({
  ...BaseResourceSchema.shape,
  ...BaseItemPresentationStepSchema.shape,
  item: ItemSchema.nullish(),
})

export const GroupPresentationStepSchema = z.object({
  ...BaseResourceSchema.shape,
  ...BaseGroupPresentationStepSchema.shape,
  group: GroupSchema.nullish(),
})

const ItemPresentationStepCreateSchema = ItemPresentationStepSchema.omit({
  ...baseResourcePropsMask,
  item: true,
})

const GroupPresentationStepCreateSchema = GroupPresentationStepSchema.omit({
  ...baseResourcePropsMask,
  group: true,
})

export const PresentationStepSchema = z.discriminatedUnion('type', [
  ItemPresentationStepSchema,
  GroupPresentationStepSchema,
])

export const PresentationStepCreateSchema = z.discriminatedUnion('type', [
  ItemPresentationStepCreateSchema,
  GroupPresentationStepCreateSchema,
])

export const PresentationStepUpdateSchema = z.discriminatedUnion('type', [
  ItemPresentationStepCreateSchema.partial().required({ type: true }),
  GroupPresentationStepCreateSchema.partial().required({ type: true }),
])
