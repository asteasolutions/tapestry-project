import { Identifiable } from 'tapestry-core/src/data-format/schemas/common.js'
import { Rel } from 'tapestry-core/src/data-format/schemas/rel.js'
import { BaseResourceDto } from './common.js'
import { TapestryDto } from './tapestry.js'

export interface RelDto extends Rel, BaseResourceDto {
  tapestry?: TapestryDto | null
  tapestryId: string
}

export type RelCreateDto = Omit<RelDto, keyof BaseResourceDto>
export type RelCreateInTapestryDto = Omit<RelCreateDto, 'tapestry' | 'tapestryId'> & Identifiable
export type RelUpdateDto = Partial<Omit<RelDto, keyof BaseResourceDto | 'tapestry' | 'tapestryId'>>
