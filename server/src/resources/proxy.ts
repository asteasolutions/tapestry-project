import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { RESTResourceImpl } from './base-resource.js'
import { BadRequestError, ServerError } from '../errors/index.js'
import {
  UserListResponse,
  WBMSnapshotDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/proxy.js'
import { parseInternetArchiveURL } from 'tapestry-core/src/internet-archive.js'
import { zipObject } from 'lodash-es'
import { RedisCache } from '../services/redis.js'
import { config } from '../config.js'

const WBM_SEARCH_ENDPOINT = 'https://web.archive.org/cdx/search/cdx'
// This limit is not imposed by the WBM search endpoint. We set it here artificially only to avoid enormous queries.
const MAX_WBM_SEARCH_LIMIT = 1000

function parseXFrameOptions(origin: string, value: string, host: string) {
  if (value === 'DENY') {
    return false
  }
  if (value === 'SAMEORIGIN' && origin === host) {
    return true
  }
  const [, ...allowed] = value.split(' ')
  return allowed.includes(host)
}

function parseCSP(origin: string, value: string, host: string) {
  const frameAncestors = value
    .split(';')
    .find((directive) => directive.trim().startsWith('frame-ancestors'))

  if (!frameAncestors) {
    return true
  }

  const [, ...allowed] = frameAncestors.trim().split(' ')

  if (allowed.includes("'self'") && origin === host) {
    return true
  }

  // TODO: add handling for wildcards
  return allowed.includes(host)
}

function canFrame(url: string, headers: Headers, host: string) {
  const { origin } = new URL(url)
  const csp = headers.get('content-security-policy')
  const allowedByCSP = !csp || parseCSP(origin, csp, host)

  const xFrameOptions = headers.get('x-frame-options')
  const alloweByXFrameOptions = !xFrameOptions || parseXFrameOptions(origin, xFrameOptions, host)

  return allowedByCSP && alloweByXFrameOptions
}

const wbmSearchResultsCache = new RedisCache('wbm-search-results')

export const proxy: RESTResourceImpl<Resources['proxy'], never> = {
  accessPolicy: {
    canCreate: () => Promise.resolve(true),
  },

  handlers: {
    create: async ({ body }, { rawRequest }) => {
      switch (body.type) {
        case 'list-wbm-snapshots': {
          // Cache WBM responses aggressively, because the IA blocks us if request rate is too high.
          const searchResponse = await wbmSearchResultsCache.memoize(
            body.url,
            async () => {
              // Endpoint docs: https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server
              const url = new URL(WBM_SEARCH_ENDPOINT)
              url.searchParams.set('url', body.url)
              // Timestamps have format yyyyMMddHHmmss. Collapsing the results using the first 8 symbols of the timestamp
              // means obtaining at most one snapshot per day.
              url.searchParams.set('collapse', 'timestamp:8')
              // This is the default but it doesn't hurt to specify it explicitly.
              url.searchParams.set('matchType', 'exact')
              url.searchParams.set('limit', `-${MAX_WBM_SEARCH_LIMIT}`)
              url.searchParams.set('output', 'json')

              const response = await fetch(url)
              const responseText = await response.text()
              if (!response.ok) {
                console.error('Error during WBM search', responseText)
                throw new ServerError('Unexpected response')
              }
              return responseText
            },
            config.server.wbmResponseCacheDuration,
          )

          const [header, ...rows] = JSON.parse(searchResponse) as string[][]
          const limit = Math.max(0, Math.min(body.limit ?? 0), MAX_WBM_SEARCH_LIMIT)
          const searchResults = limit > 0 ? rows.slice(0, limit) : rows

          return {
            type: 'list-wbm-snapshots',
            result: searchResults.map((row) => zipObject(header, row) as WBMSnapshotDto),
          }
        }
        case 'create-wbm-snapshot': {
          // We don't wait for a response here, because this is a very slow process and may take several minutes or
          // even hours in some cases. Just making the GET request should initiate WBM indexing. Clients can
          // then poll the list-wbm-snapshots proxy to see if a snapshot has been created.
          void (async () => {
            try {
              await fetch(`https://web.archive.org/save/${body.url}`)
            } catch (error) {
              console.error('Error while trying to create WBM snapshot', error)
            }
          })()

          return {
            type: 'create-wbm-snapshot',
            result: true,
          }
        }
        case 'can-frame': {
          const response = await fetch(body.url)
          if (!response.ok) {
            return { type: 'can-frame', result: false }
          }

          return {
            type: 'can-frame',
            result: canFrame(body.url, response.headers, rawRequest.host),
          }
        }
        case 'ia-user-list': {
          const descriptor = parseInternetArchiveURL(body.url)
          if (descriptor?.urlType !== 'user-list') {
            throw new BadRequestError()
          }

          return {
            type: 'ia-user-list',
            result: (await (
              await fetch(
                `https://archive.org/services/users/@${descriptor.username}/lists/${descriptor.listId}`,
              )
            ).json()) as UserListResponse,
          }
        }
        case 'content-type': {
          return {
            type: 'content-type',
            result: (await fetch(body.url, { method: 'head' })).headers.get('content-type'),
          }
        }
      }
    },
  },
}
