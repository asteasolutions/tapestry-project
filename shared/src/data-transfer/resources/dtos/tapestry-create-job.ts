import { BaseResourceDto } from './common.js'

export type JobStatus = 'pending' | 'processing' | 'complete' | 'failed'

export type TapestryCreateJobType = 'import' | 'fork'

export interface TapestryCreateJobDto extends BaseResourceDto {
  userId: string
  status: JobStatus
  progress: number
  type: TapestryCreateJobType
  tapestryId?: string | null
  parentId?: string | null
  s3Key?: string | null
}

export interface TapestryImportJobCreateDto {
  type: 'import'
  s3Key: string
}

export interface TapestryForkJobCreateDto {
  type: 'fork'
  parentId: string
  title?: string | null
  description?: string | null
}

export type TapestryCreateJobCreateDto = TapestryImportJobCreateDto | TapestryForkJobCreateDto
