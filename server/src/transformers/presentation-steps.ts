import { Prisma } from '@prisma/client'
import { omit } from 'lodash-es'
import {
  PresentationStepCreateDto,
  PresentationStepDto,
  PresentationStepUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step.js'

//eslint-disable-next-line @typescript-eslint/require-await
export async function presentationStepDbToDto(
  dbStep: Prisma.PresentationStepGetPayload<null>,
): Promise<PresentationStepDto> {
  return dbStep.itemId
    ? {
        ...dbStep,
        type: 'item',
        itemId: dbStep.itemId,
      }
    : {
        ...dbStep,
        type: 'group',
        groupId: dbStep.groupId!,
      }
}

export function presentationStepDtoToDb(
  dto: PresentationStepCreateDto,
): Prisma.PresentationStepUncheckedCreateInput
export function presentationStepDtoToDb(
  dto: PresentationStepUpdateDto,
): Prisma.PresentationStepUncheckedUpdateInput
export function presentationStepDtoToDb(
  dto: PresentationStepCreateDto | PresentationStepUpdateDto,
) {
  return { ...omit(dto, 'type'), [dto.type === 'item' ? 'groupId' : 'itemId']: null }
}
