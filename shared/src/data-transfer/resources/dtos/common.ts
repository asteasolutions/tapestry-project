import { ErrorResponseDto } from './errors.js'
import { Identifiable } from 'tapestry-core/src/data-format/schemas/common.js'

export interface BaseResourceDto extends Identifiable {
  createdAt: Date
  updatedAt: Date
}

export type RelationKeys<T> = T extends BaseResourceDto
  ? {
      [K in keyof T]: NonNullable<T[K]> extends BaseResourceDto
        ? K
        : NonNullable<T[K]> extends (infer E)[]
          ? E extends BaseResourceDto
            ? K
            : never
          : never
    }[keyof T] &
      string
  : never

export interface IdParam {
  id: string
}

export type EmptyObject = Record<string, never>

export interface ReadParamsDto {
  include?: string[] | null
}

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

export type FilterOp = (typeof FILTER_OPS)[number]

export interface ListParamsInputDto extends ReadParamsDto {
  skip?: number | null
  limit?: number | null
  orderBy?: string | string[] | null
  filter?: Record<`${string}:${FilterOp}`, string | string[] | undefined> | null
}

export type SortDirection = 'asc' | 'desc'

export interface Filter {
  prop: string
  op: FilterOp
  value: string | string[]
}

export interface ListParamsOutputDto extends ReadParamsDto {
  skip?: number | null
  limit?: number | null
  orderBy?: Record<string, SortDirection> | null
  filter?: Filter[] | null
}

export interface ListResponseDto<T> {
  total: number
  skip: number
  data: T[]
}

export interface BatchMutationDto<T extends BaseResourceDto> {
  created: T[] | ErrorResponseDto
  updated: T[] | ErrorResponseDto
  destroyed: string[] | ErrorResponseDto
}

export interface BatchMutationCreateDto<C, U> {
  create?: (C & { id: string })[] | null
  update?: Record<string, U> | null
  destroy?: string[] | null
}
