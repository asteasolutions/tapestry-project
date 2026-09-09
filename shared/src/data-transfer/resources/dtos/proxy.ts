import {
  OpenverseCollectionQuery,
  OpenverseMedia,
  OpenverseMediaType,
} from 'tapestry-core/src/openverse'
import { WikimediaCollectionQuery, WikimediaMedia } from 'tapestry-core/src/wikimedia-commons'

type WBMSnapshotKeys = [
  'urlkey',
  'timestamp',
  'original',
  'mimetype',
  'statuscode',
  'digest',
  'length',
]

export type WBMSnapshotDto = Record<WBMSnapshotKeys[number], string>

export interface UserListResponse {
  success: boolean
  value: {
    list_name: string
    description: string
    is_private: boolean
    id: number
    date_created: string
    date_updated: string
    members: {
      identifier: string
      member_id: number
      date_added: string
    }[]
  }
}

export interface ListWBMSnapshotsProxyDto {
  type: 'list-wbm-snapshots'
  result: WBMSnapshotDto[]
}

export interface CreateListWBMSnapshotsProxyDto {
  type: 'list-wbm-snapshots'
  url: string
  limit?: number
}

export interface CreateWBMSnapshotProxyDto {
  type: 'create-wbm-snapshot'
  result: true
}

export interface CanFrameProxyDto {
  type: 'can-frame'
  result: boolean
}

export interface IAUserListProxyDto {
  type: 'ia-user-list'
  result: UserListResponse
}

export interface FetchContentTypeProxyDto {
  type: 'content-type'
  result: string | null
}

export type ExternalMediaQuery =
  | { platform: 'openverse'; mediaType: OpenverseMediaType; id: string }
  | { platform: 'wikimedia-commons'; title: string }

export type ExternalCollectionQuery =
  | { platform: 'openverse'; mediaType: OpenverseMediaType; collection: OpenverseCollectionQuery }
  | { platform: 'wikimedia-commons'; collection: WikimediaCollectionQuery }

export interface ExternalMediaProxyDto {
  type: 'external-media'
  result: OpenverseMedia | WikimediaMedia | null
}

export interface CreateExternalMediaProxyDto {
  type: 'external-media'
  query: ExternalMediaQuery
}

export interface ExternalCollectionCountProxyDto {
  type: 'external-collection-count'
  result: number | undefined
}

export interface CreateExternalCollectionCountProxyDto {
  type: 'external-collection-count'
  query: ExternalCollectionQuery
}

export interface ExternalCollectionResultsProxyDto {
  type: 'external-collection-results'
  result: { total: number; results: (OpenverseMedia | WikimediaMedia)[] } | undefined
}

export interface CreateExternalCollectionResultsProxyDto {
  type: 'external-collection-results'
  query: ExternalCollectionQuery
  page: number
  pageSize: number
}

export type ProxyDto =
  | ListWBMSnapshotsProxyDto
  | CreateWBMSnapshotProxyDto
  | CanFrameProxyDto
  | IAUserListProxyDto
  | FetchContentTypeProxyDto
  | ExternalMediaProxyDto
  | ExternalCollectionCountProxyDto
  | ExternalCollectionResultsProxyDto

export type ProxyCreateDto =
  | CreateListWBMSnapshotsProxyDto
  | CreateExternalMediaProxyDto
  | CreateExternalCollectionCountProxyDto
  | CreateExternalCollectionResultsProxyDto
  | {
      type:
        | CreateWBMSnapshotProxyDto['type']
        | CanFrameProxyDto['type']
        | IAUserListProxyDto['type']
        | FetchContentTypeProxyDto['type']
      url: string
    }
