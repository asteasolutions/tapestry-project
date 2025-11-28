import {
  Resource,
  ResourceName,
  Resources,
  resources,
} from 'tapestry-shared/src/data-transfer/resources'
import { api } from './api'
import {
  EndpointTypes,
  ResourceType,
  RESTEndpoints,
} from 'tapestry-shared/src/data-transfer/resources/types'
import { GenericAbortSignal } from 'axios'
import { ListParamsInputDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common'

export interface RESTMethodOptions {
  signal?: GenericAbortSignal
  headers?: Record<string, string | undefined>
}

interface RESTMethods<R extends Partial<RESTEndpoints> = RESTEndpoints> {
  create(
    body: EndpointTypes<R['create']>['request']['body']['input'],
    query?: EndpointTypes<R['create']>['request']['query']['input'],
    options?: RESTMethodOptions,
  ): Promise<EndpointTypes<R['create']>['response']['output']>

  read(
    pathParams: EndpointTypes<R['read']>['request']['pathParams']['input'],
    query?: EndpointTypes<R['read']>['request']['query']['input'],
    options?: RESTMethodOptions,
  ): Promise<EndpointTypes<R['read']>['response']['output']>

  update(
    pathParams: EndpointTypes<R['update']>['request']['pathParams']['input'],
    body: EndpointTypes<R['update']>['request']['body']['input'],
    query?: EndpointTypes<R['update']>['request']['query']['input'],
    options?: RESTMethodOptions,
  ): Promise<EndpointTypes<R['update']>['response']['output']>

  destroy(
    pathParams: EndpointTypes<R['destroy']>['request']['pathParams']['input'],
    options?: RESTMethodOptions,
  ): Promise<EndpointTypes<R['destroy']>['response']['output']>

  list(
    query: EndpointTypes<R['list']>['request']['query']['input'],
    options?: RESTMethodOptions,
  ): Promise<EndpointTypes<R['list']>['response']['output']>
}

function interpolatePathParams(path: string, params: Record<string, string>) {
  return path.replace(/:(\w+)[^/]*/, (_, paramName: string) => params[paramName])
}

export function resource<R extends Resource>(
  resource: R,
): Pick<RESTMethods<R>, keyof R & keyof RESTMethods<R>>
export function resource<K extends ResourceName>(
  name: K,
): Pick<RESTMethods<Resources[K]>, keyof Resources[K] & keyof RESTMethods<Resources[K]>>
export function resource<T extends ResourceName | Resource>(nameOrResource: T) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  if (typeof nameOrResource === 'string') return resource(resources[nameOrResource as ResourceName])

  type R = T & Resource
  const res = nameOrResource as R

  const methods: Partial<RESTMethods<R>> = {}

  if ('create' in res) {
    methods.create = async (body, query, { signal, headers } = {}) => {
      const response = await api.post(res.create.path, body, { params: query, signal, headers })

      return res.create.responseSchema.parse(response)
    }
  }

  if ('read' in res) {
    methods.read = async (pathParams, query, { signal, headers } = {}) => {
      const response = await api.get(
        interpolatePathParams(res.read.path, pathParams as Record<string, string>),
        query,
        { signal, headers },
      )

      return res.read.responseSchema.parse(response)
    }
  }

  if ('update' in res) {
    methods.update = async (pathParams, body, query, { signal, headers } = {}) => {
      const response = await api.patch(
        interpolatePathParams(res.update.path, pathParams as Record<string, string>),
        body,
        { params: query, signal, headers },
      )

      return res.update.responseSchema.parse(response)
    }
  }

  if ('destroy' in res) {
    methods.destroy = async (pathParams, { signal, headers } = {}) =>
      api.delete(interpolatePathParams(res.destroy.path, pathParams as Record<string, string>), {
        signal,
        headers,
      })
  }

  if ('list' in res) {
    methods.list = async (query, { signal, headers } = {}) => {
      const response = await api.get(res.list.path, query, { signal, headers })

      return res.list.responseSchema.parse(response)
    }
  }

  return methods as Pick<RESTMethods<R>, keyof R & keyof RESTMethods<R>>
}

export async function listAll<R extends Partial<RESTEndpoints>>(
  resource: Pick<RESTMethods<R>, 'list'>,
  query: Omit<EndpointTypes<R['list']>['request']['query']['input'], 'skip' | 'limit'>,
  signal?: AbortSignal,
): Promise<ResourceType<R>[]> {
  const pageSize = 100

  function fetchPage(n: number) {
    return resource.list(
      {
        ...query,
        skip: n * pageSize,
        limit: pageSize,
      },
      { signal },
    )
  }

  let response = await fetchPage(0)

  const all = [...(response.data as ResourceType<R>[])]
  for (let i = 1; all.length < response.total; i += 1) {
    response = await fetchPage(i)
    all.push(...(response.data as ResourceType<R>[]))
    if (response.data.length === 0) {
      console.warn('No data received. List probably modified while loading.')
      break
    }
  }

  return all
}

export function idFilter(ids?: string | string[] | null): ListParamsInputDto['filter'] {
  if (!ids) return undefined

  const query = typeof ids === 'string' ? 'id:eq' : 'id:in'
  return { [query]: ids }
}
