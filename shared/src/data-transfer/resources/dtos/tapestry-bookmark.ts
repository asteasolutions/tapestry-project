import { BaseResourceDto } from './common.js'

export interface TapestryBookmarkDto extends BaseResourceDto {
  tapestryId: string
  userId: string
}

export type TapestryBookmarkCreateDto = Omit<TapestryBookmarkDto, keyof BaseResourceDto | 'userId'>
