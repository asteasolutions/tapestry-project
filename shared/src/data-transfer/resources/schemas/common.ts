import { set } from 'lodash-es'
import z, { ZodType } from 'zod/v4'
import { FilterOp } from '../dtos/common.js'
import { IdentifiableSchema } from 'tapestry-core/src/data-format/schemas/common.js'

export const BaseResourceSchema = z.object({
  ...IdentifiableSchema.shape,
  createdAt: z.coerce.date<Date>(),
  updatedAt: z.coerce.date<Date>(),
})

export const IdParamSchema = IdentifiableSchema.strict()

export const EmptyObjectSchema = z.object({}).strict()

export const ReadParamsSchema = z.object({
  include: z.string().array().nullish(),
})

export const FILTER_OPS = [
  'eq',
  'neq',
  'gt',
  'lt',
  'gte',
  'lte',
  'in',
  'nin',
  'contains',
  'icontains',
  'starts',
  'istarts',
  'ends',
  'iends',
  'isnull',
] as const

export const ListParamsSchema = ReadParamsSchema.extend({
  skip: z.coerce.number<number>().nonnegative().nullish(),
  limit: z.coerce.number<number>().nonnegative().nullish(),
  orderBy: z
    .string()
    .or(z.string().array())
    .nullish()
    .transform((val) => {
      if (!val) return null
      val = typeof val === 'string' ? [val] : val
      return val.reduce((order, rule) => {
        set(order, rule.replace(/^-?/, ''), rule.startsWith('-') ? 'desc' : 'asc')
        return order
      }, {})
    })
    .nullish(),
  filter: z
    .record(
      z.custom<`${string}:${FilterOp}`>(
        (val) =>
          typeof val === 'string' && (FILTER_OPS as readonly string[]).includes(val.split(':')[1]),
      ),
      z.string().or(z.string().array()),
    )
    .transform((val) =>
      Object.entries(val).map(([key, value]) => {
        const [prop, op] = key.split(':')
        return { prop, op: op as FilterOp, value: value }
      }),
    )
    .nullish(),
})

export function listResponse<R extends ZodType>(resourceSchema: R) {
  return z.object({
    total: z.number().nonnegative(),
    skip: z.number().nonnegative(),
    data: resourceSchema.array(),
  })
}

export function batchMutation<R extends ZodType>(resourceSchema: R) {
  return z.object({
    created: resourceSchema.array(),
    updated: resourceSchema.array(),
    destroyed: z.string().array(),
  })
}

export function batchMutationCreateParams<C extends ZodType, U extends ZodType>(
  createParams: C,
  updateParams: U,
) {
  return z.object({
    create: createParams
      .and(z.object({ id: z.string() }))
      .array()
      .nullish(),
    update: z.record(z.string(), updateParams).nullish(),
    destroy: z.string().array().nullish(),
  })
}

export const trimString = (val: string) => val.trim()
