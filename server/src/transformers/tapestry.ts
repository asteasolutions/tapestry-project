import { Prisma } from '@prisma/client'
import { get, set } from 'lodash-es'
import { HexColor } from 'tapestry-core/src/data-format/schemas/common.js'
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry.js'
import { extractInternallyHostedS3Key, s3Service } from '../services/s3-service.js'

export async function tapestryDbToDto(
  dbTapestry: Prisma.TapestryGetPayload<null>,
): Promise<TapestryDto> {
  return {
    id: dbTapestry.id,
    createdAt: dbTapestry.createdAt,
    updatedAt: dbTapestry.updatedAt,
    visibility: dbTapestry.visibility,
    title: dbTapestry.title,
    slug: dbTapestry.slug,
    description: dbTapestry.description,
    background: dbTapestry.background as HexColor,
    ownerId: dbTapestry.ownerId,
    parentId: dbTapestry.parentId,
    theme: dbTapestry.theme,
    thumbnail: dbTapestry.thumbnail && (await s3Service.getReadObjectUrl(dbTapestry.thumbnail)),
    allowForking: dbTapestry.allowForking,
    startView:
      dbTapestry.startViewX !== null &&
      dbTapestry.startViewY !== null &&
      dbTapestry.startViewWidth !== null &&
      dbTapestry.startViewHeight !== null
        ? {
            position: {
              x: dbTapestry.startViewX,
              y: dbTapestry.startViewY,
            },
            size: {
              width: dbTapestry.startViewWidth,
              height: dbTapestry.startViewHeight,
            },
          }
        : null,
  }
}

type TapestryDBField = keyof Prisma.TapestryGetPayload<null>
const DB_TO_DTO_FIELD_MAP: Record<TapestryDBField, string> = {
  id: 'id',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  visibility: 'visibility',
  title: 'title',
  slug: 'slug',
  description: 'description',
  ownerId: 'ownerId',
  theme: 'theme',
  background: 'background',
  parentId: 'parentId',
  startViewX: 'startView.position.x',
  startViewY: 'startView.position.y',
  startViewWidth: 'startView.size.width',
  startViewHeight: 'startView.size.height',
  thumbnail: 'thumbnail',
  allowForking: 'allowForking',
}

export function tapestryDtoToDb(tapestry: TapestryDto): Prisma.TapestryGetPayload<null>
export function tapestryDtoToDb<const O extends TapestryDBField>(
  tapestry: Partial<TapestryDto>,
  omit: O[],
): Omit<Prisma.TapestryGetPayload<null>, O>
export function tapestryDtoToDb<const O extends TapestryDBField>(
  tapestry: Partial<TapestryDto>,
  omit?: O[],
): Omit<Prisma.TapestryGetPayload<null>, O> {
  const fieldsToAssign = (Object.keys(DB_TO_DTO_FIELD_MAP) as TapestryDBField[]).filter(
    (field) => !(omit as string[] | undefined)?.includes(field),
  )

  const dbTapestry: Partial<Prisma.TapestryGetPayload<null>> = {}
  for (const field of fieldsToAssign) {
    set(dbTapestry, field, get(tapestry, DB_TO_DTO_FIELD_MAP[field]))
  }

  dbTapestry.thumbnail = extractInternallyHostedS3Key(dbTapestry.thumbnail) ?? dbTapestry.thumbnail

  return dbTapestry as Omit<Prisma.TapestryGetPayload<null>, O>
}
