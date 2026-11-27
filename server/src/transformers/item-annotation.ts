import { AnnotationDto } from 'tapestry-shared/src/data-transfer/resources/dtos/annotation'
import { Prisma } from '../../prisma/generated/prisma/client'

//eslint-disable-next-line @typescript-eslint/require-await
export async function itemAnnotationDbToDto(
  dbAnnotation: Prisma.ItemAnnotationGetPayload<null>,
): Promise<AnnotationDto> {
  return {
    id: dbAnnotation.id,
    createdAt: dbAnnotation.createdAt,
    updatedAt: dbAnnotation.updatedAt,
    isHighlight: dbAnnotation.isHighlight,
    itemId: dbAnnotation.itemId,
    authorId: dbAnnotation.authorId,
  }
}
