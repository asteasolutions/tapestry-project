import { Prisma } from '@prisma/client'
import { get, set } from 'lodash-es'
import { HexColor } from 'tapestry-core/src/data-format/schemas/common.js'
import { RelDto } from 'tapestry-shared/src/data-transfer/resources/dtos/rel.js'

//eslint-disable-next-line @typescript-eslint/require-await
export async function relDbToDto(dbRel: Prisma.RelGetPayload<null>): Promise<RelDto> {
  return {
    id: dbRel.id,
    createdAt: dbRel.createdAt,
    updatedAt: dbRel.updatedAt,
    tapestryId: dbRel.tapestryId,
    color: dbRel.color as HexColor,
    weight: dbRel.weight,
    from: {
      itemId: dbRel.fromItemId,
      arrowhead: dbRel.fromArrowhead,
      anchor: {
        x: dbRel.fromAnchorX,
        y: dbRel.fromAnchorY,
      },
    },
    to: {
      itemId: dbRel.toItemId,
      arrowhead: dbRel.toArrowhead,
      anchor: {
        x: dbRel.toAnchorX,
        y: dbRel.toAnchorY,
      },
    },
  }
}

type RelDBField = keyof Prisma.RelGetPayload<null>
const DB_TO_DTO_FIELD_MAP: Record<RelDBField, string> = {
  id: 'id',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  tapestryId: 'tapestryId',
  fromItemId: 'from.itemId',
  fromAnchorX: 'from.anchor.x',
  fromAnchorY: 'from.anchor.y',
  fromArrowhead: 'from.arrowhead',
  toItemId: 'to.itemId',
  toAnchorX: 'to.anchor.x',
  toAnchorY: 'to.anchor.y',
  toArrowhead: 'to.arrowhead',
  color: 'color',
  weight: 'weight',
}

export function relDtoToDb(rel: RelDto): Prisma.RelGetPayload<null>
export function relDtoToDb<const O extends RelDBField>(
  rel: Partial<RelDto>,
  omit: O[],
): Omit<Prisma.RelGetPayload<null>, O>
export function relDtoToDb<O extends RelDBField>(
  rel: Partial<RelDto>,
  omit?: O[],
): Omit<Prisma.RelGetPayload<null>, O> {
  const fieldsToAssign = (Object.keys(DB_TO_DTO_FIELD_MAP) as RelDBField[]).filter(
    (field) => !(omit as string[] | undefined)?.includes(field),
  )

  const dbRel: Partial<Prisma.RelGetPayload<null>> = {}
  for (const field of fieldsToAssign) {
    set(dbRel, field, get(rel, DB_TO_DTO_FIELD_MAP[field]))
  }

  return dbRel as Omit<Prisma.RelGetPayload<null>, O>
}
