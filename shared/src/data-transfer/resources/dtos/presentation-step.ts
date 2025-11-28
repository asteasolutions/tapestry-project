import {
  GroupPresentationStep,
  ItemPresentationStep,
} from 'tapestry-core/src/data-format/schemas/presentation-step.js'
import { BaseResourceDto, RelationKeys } from './common.js'
import { GroupDto } from './group.js'
import { ItemDto } from './item.js'
import { DistributiveOmit } from 'tapestry-core/src/type-utils.js'

export interface ItemPresentationStepDto extends ItemPresentationStep, BaseResourceDto {
  item?: ItemDto | null
}

export interface GroupPresentationStepDto extends GroupPresentationStep, BaseResourceDto {
  group?: GroupDto | null
}

export type PresentationStepDto = ItemPresentationStepDto | GroupPresentationStepDto

export type PresentationStepCreateDto = DistributiveOmit<
  PresentationStepDto,
  keyof BaseResourceDto | RelationKeys<PresentationStepDto>
>

export type PresentationStepUpdateDto = Partial<PresentationStepCreateDto> & {
  type: PresentationStepDto['type']
}
