import { Prisma } from '@prisma/client'
import { get, isEmpty, set } from 'lodash-es'
import {
  BaseResourceDto,
  BatchMutationCreateDto,
  BatchMutationDto,
  Filter,
  FilterOp,
  ListParamsOutputDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/common.js'
import { RESTEndpoints, IO } from 'tapestry-shared/src/data-transfer/resources/types.js'
import { AccessPolicy } from './base-resource.js'
import { isNotFoundError } from '../db.js'
import { OneOrMore, ExtractType, ensureArray } from 'tapestry-core/src/utils.js'
import { BadRequestError, toAPIError, toErrorDto } from '../errors/index.js'
import { ErrorResponseDto } from 'tapestry-shared/src/data-transfer/resources/dtos/errors.js'

function toDbOp(op: FilterOp, value: string | string[]) {
  return {
    eq: { equals: value },
    neq: { not: value },
    gt: { gt: value },
    lt: { lt: value },
    gte: { gte: value },
    lte: { lte: value },
    in: { in: value },
    nin: { notIn: value },
    contains: { contains: value },
    icontains: { contains: value, mode: 'insensitive' },
    starts: { startsWith: value },
    istarts: { startsWith: value, mode: 'insensitive' },
    ends: { endsWith: value },
    iends: { endsWith: value, mode: 'insensitive' },
    isnull: /true/i.test(String(value)) ? { equals: null } : { not: null },
  }[op]
}

export type CustomFilterParser<F> = (filter: Omit<Filter, 'prop'>) => F

export type CustomFilters<P extends string, F> = Record<P, CustomFilterParser<F>>

export function parseListFilter<F, CustomFilterProp extends string = never>(
  query: ListParamsOutputDto,
  customFilterParsers?: Record<CustomFilterProp, CustomFilterParser<F>>,
) {
  const dbFilters = query.filter?.map(({ prop, op, value }) => {
    if (customFilterParsers && prop in customFilterParsers) {
      return customFilterParsers[prop as CustomFilterProp]({ op, value })
    }
    // Artificially prevent too deep queries to avoid multiple joins
    if (prop.split('.').length > 2) {
      throw new BadRequestError('Filter too deep')
    }
    return set({}, prop, toDbOp(op, value)) as F
  })
  const skip = query.skip ?? 0
  const limit = query.limit ?? 10
  const orderBy = query.orderBy ?? { createdAt: 'desc' }

  return { where: { AND: dbFilters }, skip, limit, orderBy } as const
}

type SupportedFilterValueTypeMap = {
  string: string
  array: string[]
}
type SupportedFilterValueType = keyof SupportedFilterValueTypeMap
interface SupportedFilterOp {
  op: OneOrMore<FilterOp>
  valueType: OneOrMore<SupportedFilterValueType>
}

export function checkOpSupport<const T extends OneOrMore<SupportedFilterOp>>(
  supports: T,
  op: FilterOp,
  value: Filter['value'],
): asserts value is SupportedFilterValueTypeMap[ExtractType<ExtractType<T>['valueType']>] {
  const valueType = Array.isArray(value) ? 'array' : 'string'
  for (const supported of ensureArray(supports)) {
    if (
      ensureArray(supported.op).includes(op) &&
      ensureArray(supported.valueType).includes(valueType)
    ) {
      return
    }
  }
  throw new BadRequestError(`Operation ${op} is not supported on value of type ${valueType}`)
}

interface Includes {
  [k: string]: Includes
}

// Converts includes of the form ['tapestry.items', 'tapestry.rels'] to
// nested objects: { tapestry: { items: {}, rels: {} } }
function normalizeIncludes(includes: string[]): Includes {
  const normalizedIncludes: Includes = {}

  for (const include of includes) {
    if (!(get(normalizedIncludes, include) as Includes | undefined)) {
      set(normalizedIncludes, include, {})
    }
  }

  return normalizedIncludes
}

type DbIncludes<M extends Prisma.ModelName> =
  Prisma.TypeMap['model'][M]['operations']['findUniqueOrThrow']['args']['include']

function processIncludes<M extends Prisma.ModelName>(
  modelName: M,
  normalizedIncludes: Record<string, never>,
): true
function processIncludes<M extends Prisma.ModelName>(
  modelName: M,
  normalizedIncludes: Includes,
): DbIncludes<M>
function processIncludes<M extends Prisma.ModelName>(modelName: M, normalizedIncludes: Includes) {
  if (isEmpty(normalizedIncludes)) return true

  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName)
  if (!model) throw new Error(`Unknown model name ${modelName}`)

  const result: Record<string, unknown> = {}
  const relations = model.fields.filter((f) => f.kind === 'object')
  for (const [key, includes] of Object.entries(normalizedIncludes)) {
    const relation = relations.find((f) => f.name === key)
    if (!relation) continue

    const nestedIncludes = processIncludes(relation.type as Prisma.ModelName, includes)
    result[key] = typeof nestedIncludes === 'object' ? { include: nestedIncludes } : nestedIncludes
  }

  return result as DbIncludes<M>
}

export function parseIncludes<M extends Prisma.ModelName>(
  modelName: M,
  includes: string[] | null | undefined,
): DbIncludes<M> | undefined {
  if (!includes?.length) return

  return processIncludes(modelName, normalizeIncludes(includes))
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function createBatchMutationsAccessPolicy<R extends BaseResourceDto, C, U>(
  originalAccessPolicy: AccessPolicy<
    Pick<RESTEndpoints<any, any, IO<R>, IO<C>, IO<U>>, 'create' | 'update' | 'destroy'>,
    never
  >,
): AccessPolicy<
  Pick<
    RESTEndpoints<any, any, IO<BatchMutationDto<R>>, IO<BatchMutationCreateDto<C, U>>, IO<never>>,
    'create'
  >,
  never
> {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return {
    canCreate: async ({ body }, context) => {
      for (const createDto of body.create ?? []) {
        const canCreate = await originalAccessPolicy.canCreate(
          { body: createDto, pathParams: {}, query: {} },
          context,
        )
        if (!canCreate) return false
      }

      for (const [id, updateDto] of Object.entries(body.update ?? {})) {
        try {
          const canUpdate = await originalAccessPolicy.canUpdate(
            { body: updateDto, pathParams: { id }, query: {} },
            context,
          )
          if (!canUpdate) return false
        } catch (error) {
          if (isNotFoundError(error)) {
            // Here we assume that if the access policy throws a "not found" error, then the target
            // object is missing. In this case, don't deny the whole batch update. Updating a missing
            // object will be a no-op.
            continue
          }
          throw error
        }
      }

      for (const id of body.destroy ?? []) {
        try {
          const canDestroy = await originalAccessPolicy.canDestroy(
            { body: {}, pathParams: { id }, query: {} },
            context,
          )

          if (!canDestroy) return false
        } catch (error) {
          if (isNotFoundError(error)) {
            // Same as above. Deleting a missing object will be a no-op.
            continue
          }
          throw error
        }
      }

      return true
    },
  }
}

export interface BatchMutateActions<Dto extends BaseResourceDto, C, U> {
  create(data: NonNullable<BatchMutationCreateDto<C, U>['create']>): Promise<Dto[]>
  update(updates: Record<string, U>): Promise<Dto[]>
  destroy(ids: string[]): Promise<{ count: number }>
  findByIds(ids: string[]): Promise<{ id: string }[]>
}

async function resultOrError<T>(action: () => Promise<T>): Promise<T | ErrorResponseDto> {
  try {
    return await action()
  } catch (error) {
    return toErrorDto(toAPIError(error))
  }
}

export async function batchMutate<Dto extends BaseResourceDto, C, U>(
  input: BatchMutationCreateDto<C, U>,
  actions: BatchMutateActions<Dto, C, U>,
) {
  const response: BatchMutationDto<Dto> = {
    created: [],
    updated: [],
    destroyed: [],
  }

  if (input.create && input.create.length > 0) {
    response.created = await resultOrError(() => actions.create(input.create!))
  }

  if (input.update && !isEmpty(input.update)) {
    response.updated = await resultOrError(() => actions.update(input.update!))
  }

  if (input.destroy && input.destroy.length > 0) {
    response.destroyed = await resultOrError(async () => {
      const { count } = await actions.destroy(input.destroy!)
      if (count === input.destroy!.length) {
        return input.destroy!
      }
      const failedToDestroy = await actions.findByIds(input.destroy!)
      return [...new Set(input.destroy).difference(new Set(failedToDestroy.map((i) => i.id)))]
    })
  }

  return response
}
