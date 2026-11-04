import { BaseResourceDto } from './common.js'

export const FEATURE_REQUEST_STATUSES = ['pending', 'approved', 'declined', 'closed'] as const

export type FeatureRequestStatus = (typeof FEATURE_REQUEST_STATUSES)[number]

export interface FeatureRequestDto extends BaseResourceDto {
  tapestryId: string | null
  tapestryTitle: string
  requesterId: string | null
  status: FeatureRequestStatus
  decidedAt: Date | null
}

export interface FeatureRequestCreateDto {
  tapestryId: string
}
