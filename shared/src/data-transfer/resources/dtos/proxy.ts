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

export type ProxyDto =
  | ListWBMSnapshotsProxyDto
  | CreateWBMSnapshotProxyDto
  | CanFrameProxyDto
  | IAUserListProxyDto
  | FetchContentTypeProxyDto

export type ProxyCreateDto =
  | CreateListWBMSnapshotsProxyDto
  | {
      type:
        | CreateWBMSnapshotProxyDto['type']
        | CanFrameProxyDto['type']
        | IAUserListProxyDto['type']
        | FetchContentTypeProxyDto['type']
      url: string
    }
