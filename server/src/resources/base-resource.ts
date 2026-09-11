import { Request, Response, Router } from 'express'
import {
  AuthOf,
  Endpoint,
  EndpointTypes,
} from 'tapestry-shared/src/data-transfer/resources/types.js'
import { authenticate } from '../auth/index.js'
import { capitalize, get } from 'lodash-es'
import { ForbiddenError, InvalidAccessTokenError } from '../errors/index.js'

export interface RequestContext<RequiresAuth extends boolean = boolean, ListFilter = unknown> {
  userId: true extends RequiresAuth ? string : string | null
  listFilter: ListFilter
  rawRequest: Request
  rawResponse: Response
}

interface EndpointParams<E extends Endpoint> {
  pathParams: EndpointTypes<E>['request']['pathParams']['output']
  query: EndpointTypes<E>['request']['query']['output']
  body: EndpointTypes<E>['request']['body']['output']
}

type EndpointHandler<E extends Endpoint, ListFilter> = (
  request: EndpointParams<E>,
  context: RequestContext<AuthOf<E>, ListFilter>,
) => Promise<EndpointTypes<E>['response']['input']>

type RESTResourceHandlers<E extends Record<string, Endpoint>, ListFilter> = {
  [K in keyof E]: EndpointHandler<E[K], ListFilter>
}

type AuthorizationHandler<E extends Endpoint> = (
  request: EndpointParams<E>,
  context: RequestContext<AuthOf<E>>,
) => Promise<boolean>

type ListFilterFactory<T> = (userId: string | null) => T

type ListFilterFactoryProvider<T> = [T] extends [never]
  ? object
  : { createListFilter: ListFilterFactory<T> }

export type AccessPolicy<
  E extends Record<string, Endpoint>,
  ListFilter,
> = ListFilterFactoryProvider<ListFilter> & {
  [K in keyof E & string as `can${Capitalize<K>}`]: AuthorizationHandler<E[K]>
}

export interface RESTResourceImpl<E extends Record<string, Endpoint>, ListFilter> {
  accessPolicy: AccessPolicy<E, ListFilter>
  handlers: RESTResourceHandlers<E, ListFilter>
}

function getIncludes(query: object) {
  const includes = get(query, 'include')
  return Array.isArray(includes) && typeof includes[0] === 'string' ? (includes as string[]) : []
}

function validateIncludes(query: object, allowedIncludes: string[]) {
  for (const include of getIncludes(query)) {
    // Appending a dot ensures that we will not mistakenly allow an include which is a substring
    // of an allowed include, for example, allow `.item` when only `.items` is allowed.
    if (!allowedIncludes.some((allowed) => `${allowed}.`.startsWith(`${include}.`))) {
      throw new ForbiddenError(`Include ${include} not allowed`)
    }
  }
}

function bindEndpoint<E extends Endpoint, ListFilter>(
  router: Router,
  endpoint: E,
  handler: EndpointHandler<E, ListFilter>,
  authorize: AuthorizationHandler<E>,
  createListFilter?: (userId: string | null) => ListFilter,
) {
  router[endpoint.method](`/${endpoint.path}`, async (req, res, next) => {
    try {
      let userId: string | null = null
      try {
        userId = authenticate(req)
      } catch {
        throw new InvalidAccessTokenError()
      }
      if (endpoint.requiresAuthentication && !userId) {
        throw new InvalidAccessTokenError()
      }

      const context = {
        rawRequest: req,
        rawResponse: res,
        userId,
        listFilter: createListFilter?.(userId),
      } as RequestContext<AuthOf<E>, ListFilter>

      const pathParams = endpoint.requestSchemas.pathParams.parse(
        req.params,
      ) as EndpointTypes<E>['request']['pathParams']['output']

      const query = endpoint.requestSchemas.query.parse(
        req.query,
      ) as EndpointTypes<E>['request']['query']['output']
      validateIncludes(query, endpoint.allowedIncludes as string[])

      const isFile = req.headers['content-type']?.toLowerCase() === 'application/octet-stream'
      if (isFile) {
        const chunks: ArrayBuffer[] = []
        req.on('data', (chunk: ArrayBuffer) => chunks.push(chunk))
        req.on('end', async () => {
          try {
            res.json(await handler({ pathParams, query, body: new Blob(chunks) }, context))
          } catch (error) {
            next(error)
          }
        })
      } else {
        const body = endpoint.requestSchemas.body.parse(
          req.body,
        ) as EndpointTypes<E>['request']['body']['output']

        const canAccess = await authorize({ pathParams, query, body }, context)
        if (!canAccess) throw new ForbiddenError()

        res.json(await handler({ pathParams, query, body }, context))
      }
    } catch (error) {
      next(error)
    }
  })
}

export function bindEndpoints<E extends Record<string, Endpoint>, ListFilter>(
  endpoints: E,
  { accessPolicy, handlers }: RESTResourceImpl<E, ListFilter>,
) {
  const router = Router()
  for (const endpointName of Object.keys(endpoints) as (keyof E & string)[]) {
    const authorize = get(accessPolicy, `can${capitalize(endpointName)}`) as AuthorizationHandler<
      E[keyof E]
    >
    const createListFilter = get(accessPolicy, 'createListFilter') as
      | ListFilterFactory<ListFilter>
      | undefined
    bindEndpoint(
      router,
      endpoints[endpointName],
      handlers[endpointName],
      authorize,
      createListFilter,
    )
  }
  return router
}
