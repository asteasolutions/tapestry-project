import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { RESTResourceImpl } from './base-resource.js'
import { BadRequestError, ServerError } from '../errors/index.js'
import {
  UserListResponse,
  WBMSnapshotDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/proxy.js'
import { parseInternetArchiveURL } from 'tapestry-core/src/internet-archive.js'
import { zipObject } from 'lodash-es'
import sharp from 'sharp'
import { WEB_SOURCE_PARSERS } from 'tapestry-core/src/web-sources/index.js'
import { googleDriveWebpageType } from 'tapestry-core/src/web-sources/google-drive.js'
import { RedisCache } from '../services/redis.js'
import { config } from '../config.js'

const WBM_SEARCH_ENDPOINT = 'https://web.archive.org/cdx/search/cdx'
// This limit is not imposed by the WBM search endpoint. We set it here artificially only to avoid enormous queries.
const MAX_WBM_SEARCH_LIMIT = 1000

function parseXFrameOptions(origin: string, value: string, host: string) {
  if (value.toUpperCase() === 'DENY') {
    return false
  }
  if (value.toUpperCase() === 'SAMEORIGIN' && origin === host) {
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
    return undefined
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
  const allowedByCSP = csp ? parseCSP(origin, csp, host) : undefined
  if (allowedByCSP !== undefined) {
    return allowedByCSP
  }

  const xFrameOptions = headers.get('x-frame-options')
  const allowedByXFrameOptions = !xFrameOptions || parseXFrameOptions(origin, xFrameOptions, host)

  return allowedByXFrameOptions
}

interface GoogleDriveFile {
  mimeType?: string
  videoMediaMetadata?: { width?: number; height?: number }
  imageMediaMetadata?: { width?: number; height?: number }
}

// Requires an API key. Works only for files that are shared with anyone with the link.
async function fetchGoogleDriveFile(fileId: string, resourceKey: string | null) {
  if (!config.server.googleApiKey) return null

  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`)
  url.searchParams.set(
    'fields',
    'mimeType,videoMediaMetadata(width,height),imageMediaMetadata(width,height)',
  )
  url.searchParams.set('supportsAllDrives', 'true')
  url.searchParams.set('key', config.server.googleApiKey)
  const response = await fetch(url, {
    headers: resourceKey ? { 'X-Goog-Drive-Resource-Keys': `${fileId}/${resourceKey}` } : {},
  })
  if (!response.ok) {
    console.warn(`Google Drive API responded with ${response.status} for file ${fileId}`)
    return null
  }
  return (await response.json()) as GoogleDriveFile
}

async function fetchGoogleDriveThumbnailSize(url: string) {
  const response = await fetch(WEB_SOURCE_PARSERS.googleDrive.getThumbnailUrl(url))
  // Google responds with a sign-in page instead of a thumbnail for private files
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) return null

  const { width, height } = await sharp(await response.arrayBuffer()).metadata()
  return { width, height }
}

async function getGoogleDriveMetadata(url: string) {
  const parser = WEB_SOURCE_PARSERS.googleDrive
  const fileId = parser.getFileId(url)
  if (!(await parser.matches(url)) || !fileId) {
    throw new BadRequestError()
  }

  try {
    const file = await fetchGoogleDriveFile(fileId, new URL(url).searchParams.get('resourcekey'))
    const { width, height } = file?.videoMediaMetadata ?? file?.imageMediaMetadata ?? {}
    return {
      webpageType: googleDriveWebpageType(file?.mimeType),
      size: width && height ? { width, height } : await fetchGoogleDriveThumbnailSize(url),
    }
  } catch (error) {
    console.warn(`Failed to read Google Drive file ${fileId}`, error)
    return { webpageType: googleDriveWebpageType(null), size: null }
  }
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
            (response) =>
              (JSON.parse(response) as string[][]).length === 0
                ? config.server.wbmEmptyResponseCacheDuration
                : config.server.wbmResponseCacheDuration,
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
            // The resource is framed by the client app, so we check against its origin, not the API host
            result: canFrame(
              body.url,
              response.headers,
              rawRequest.get('origin') ?? new URL(config.server.viewerUrl).origin,
            ),
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
        case 'google-drive-metadata': {
          return { type: 'google-drive-metadata', result: await getGoogleDriveMetadata(body.url) }
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
