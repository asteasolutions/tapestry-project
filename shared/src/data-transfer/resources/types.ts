import type { ZodType } from 'zod/v4'
import type { Path } from 'tapestry-core/src/type-utils.js'
import {
  EmptyObject,
  IdParam,
  ListParamsInputDto,
  ListParamsOutputDto,
  ListResponseDto,
  ReadParamsDto,
} from './dtos/common.js'

export const baseResourcePropsMask = {
  id: true,
  createdAt: true,
  updatedAt: true,
} as const

export type HTTPMethod = 'post' | 'get' | 'patch' | 'delete' | 'put' | 'head' | 'options'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IO<Output = any, Input = Output> {
  input: Input
  output: Output
}

export type ZodSchemaForIO<T extends IO> = ZodType<T['output'], T['input']>

export interface Request<PathParams extends IO = IO, Query extends IO = IO, Body extends IO = IO> {
  pathParams: PathParams
  query: Query
  body: Body
}

export type Includes<R> = readonly Path<R>[]

export interface Endpoint<
  Method extends HTTPMethod = HTTPMethod,
  Path extends string = string,
  Auth extends boolean = boolean,
  PathParams extends IO = IO,
  Query extends IO = IO,
  Body extends IO = IO,
  Response extends IO = IO,
  ResourceType = Response['output'],
> {
  method: Method
  path: Path
  requiresAuthentication: Auth
  allowedIncludes: Includes<ResourceType>
  requestSchemas: {
    pathParams: ZodSchemaForIO<PathParams>
    query: ZodSchemaForIO<Query>
    body: ZodSchemaForIO<Body>
  }
  responseSchema: ZodSchemaForIO<Response>
}

export type EndpointsMask = `${'c' | ''}${'r' | ''}${'u' | ''}${'d' | ''}${'l' | ''}`

export type Has<
  A extends string,
  B extends string,
  T = true,
  F = false,
> = A extends `${string}${B}${string}` ? T : F

export interface RESTEndpoints<
  Name extends string = string,
  Auth extends EndpointsMask = EndpointsMask,
  Response extends IO = IO,
  CreateParams extends IO = IO,
  UpdateParams extends IO = IO,
> {
  create: Endpoint<
    'post',
    Name,
    Has<Auth, 'c'>,
    IO<EmptyObject>,
    IO<ReadParamsDto>,
    CreateParams,
    Response
  >
  read: Endpoint<
    'get',
    `${Name}/:id(.{0,})`,
    Has<Auth, 'r'>,
    IO<IdParam>,
    IO<ReadParamsDto>,
    IO<EmptyObject>,
    Response
  >
  update: Endpoint<
    'patch',
    `${Name}/:id`,
    Has<Auth, 'u'>,
    IO<IdParam>,
    IO<ReadParamsDto>,
    UpdateParams,
    Response
  >
  destroy: Endpoint<
    'delete',
    `${Name}/:id`,
    Has<Auth, 'd'>,
    IO<IdParam>,
    IO<EmptyObject>,
    IO<EmptyObject>,
    IO<void>
  >
  list: Endpoint<
    'get',
    Name,
    Has<Auth, 'l'>,
    IO<EmptyObject>,
    IO<ListParamsOutputDto, ListParamsInputDto>,
    IO<EmptyObject>,
    IO<ListResponseDto<Response['output']>>,
    Response['output']
  >
}

export type Endpoints<Mask extends EndpointsMask> = {
  create: Has<Mask, 'c', 'create', never>
  read: Has<Mask, 'r', 'read', never>
  update: Has<Mask, 'u', 'update', never>
  destroy: Has<Mask, 'd', 'destroy', never>
  list: Has<Mask, 'l', 'list', never>
}[keyof RESTEndpoints]

export type EndpointTypes<E> =
  E extends Endpoint<
    HTTPMethod,
    string,
    boolean,
    infer PathParams,
    infer Query,
    infer Body,
    infer Response,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >
    ? {
        request: {
          pathParams: PathParams
          query: Query
          body: Body
        }
        response: Response
      }
    : never

export type AuthOf<E> = E extends Endpoint<HTTPMethod, string, infer Auth> ? Auth : never

export type ResourceType<E> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Partial<RESTEndpoints<any, any, infer R, any, any>> ? R['output'] : never

export type CreateParams<E> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends RESTEndpoints<any, any, any, infer C, any> ? C['input'] : never

export type UpdateParams<E> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends RESTEndpoints<any, any, any, any, infer U> ? U['input'] : never
