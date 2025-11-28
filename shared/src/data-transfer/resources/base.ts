import z from 'zod/v4'
import {
  Endpoints,
  EndpointsMask,
  Has,
  Includes,
  IO,
  RESTEndpoints,
  ZodSchemaForIO,
} from './types.js'
import {
  EmptyObjectSchema,
  IdParamSchema,
  ListParamsSchema,
  listResponse,
  ReadParamsSchema,
} from './schemas/common.js'

export interface RESTEndpointsConfig<
  N extends string,
  M extends EndpointsMask,
  A extends EndpointsMask,
  R extends IO,
  C extends IO,
  U extends IO,
> {
  name: N
  endpoints: M
  requireAuth: A
  schema: ZodSchemaForIO<R>
  allowedIncludes?: Includes<R['output']>
  createParamsSchema?: ZodSchemaForIO<C>
  updateParamsSchema?: ZodSchemaForIO<U>
}

export function createRESTEndpoints<
  Resource extends IO,
  CreateParams extends IO = IO<never>,
  UpdateParams extends IO = IO<never>,
>() {
  return function <N extends string, M extends EndpointsMask, A extends EndpointsMask>({
    name,
    schema,
    endpoints,
    requireAuth,
    allowedIncludes = [],
    createParamsSchema,
    updateParamsSchema,
  }: RESTEndpointsConfig<N, M, A, Resource, CreateParams, UpdateParams>): Pick<
    RESTEndpoints<N, A, Resource, CreateParams, UpdateParams>,
    Endpoints<M>
  > {
    const endpointDescriptors: Partial<RESTEndpoints<N, A, Resource, CreateParams, UpdateParams>> =
      {}

    if (endpoints.includes('c')) {
      if (!createParamsSchema) {
        throw new Error('Must specify create params schema in order to define create endpoint!')
      }

      endpointDescriptors.create = {
        method: 'post',
        path: name,
        allowedIncludes,
        requiresAuthentication: requireAuth.includes('c') as Has<A, 'c'>,
        requestSchemas: {
          pathParams: EmptyObjectSchema,
          query: ReadParamsSchema,
          body: createParamsSchema,
        },
        responseSchema: schema,
      }
    }

    if (endpoints.includes('r')) {
      endpointDescriptors.read = {
        method: 'get',
        // XXX: This expression is not spported in Express 5 https://expressjs.com/en/guide/routing.html#route-parameters
        path: `${name}/:id(.{0,})`,
        allowedIncludes,
        requiresAuthentication: requireAuth.includes('r') as Has<A, 'r'>,
        requestSchemas: {
          pathParams: IdParamSchema,
          query: ReadParamsSchema,
          body: EmptyObjectSchema,
        },
        responseSchema: schema,
      }
    }

    if (endpoints.includes('u')) {
      if (!updateParamsSchema) {
        throw new Error('Must specify update params schema in order to define update endpoint!')
      }

      endpointDescriptors.update = {
        method: 'patch',
        path: `${name}/:id`,
        allowedIncludes,
        requiresAuthentication: requireAuth.includes('u') as Has<A, 'u'>,
        requestSchemas: {
          pathParams: IdParamSchema,
          query: ReadParamsSchema,
          body: updateParamsSchema,
        },
        responseSchema: schema,
      }
    }

    if (endpoints.includes('d')) {
      endpointDescriptors.destroy = {
        method: 'delete',
        path: `${name}/:id`,
        allowedIncludes: [],
        requiresAuthentication: requireAuth.includes('d') as Has<A, 'd'>,
        requestSchemas: {
          pathParams: IdParamSchema,
          query: EmptyObjectSchema,
          body: EmptyObjectSchema,
        },
        responseSchema: z.void(),
      }
    }

    if (endpoints.includes('l')) {
      endpointDescriptors.list = {
        method: 'get',
        path: name,
        allowedIncludes,
        requiresAuthentication: requireAuth.includes('l') as Has<A, 'l'>,
        requestSchemas: {
          pathParams: EmptyObjectSchema,
          query: ListParamsSchema,
          body: EmptyObjectSchema,
        },
        responseSchema: listResponse(schema),
      }
    }

    return endpointDescriptors as Pick<
      RESTEndpoints<N, A, Resource, CreateParams, UpdateParams>,
      Endpoints<M>
    >
  }
}
