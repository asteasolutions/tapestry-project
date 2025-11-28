import { Group } from 'tapestry-core/src/data-format/schemas/group.js'
import { BaseResourceDto } from './common.js'
import { TapestryDto } from './tapestry.js'

export interface GroupDto extends Group, BaseResourceDto {
  tapestry?: TapestryDto | null
  tapestryId: string
}

export type GroupCreateDto = Omit<GroupDto, keyof BaseResourceDto | 'tapestry'>
export type GroupUpdateDto = Partial<
  Omit<GroupDto, keyof BaseResourceDto | 'tapestry' | 'tapestryId'>
>
