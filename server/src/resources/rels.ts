import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { ensureTransaction, prisma } from '../db.js'
import { RequestContext, RESTResourceImpl } from './base-resource.js'
import { relDtoToDb } from '../transformers/rel.js'
import {
  canEditTapestry,
  canListTapestryElements,
  canViewTapestry,
  scheduleTapestryThumbnailGeneration,
} from './tapestries.js'
import { parseIncludes, parseListFilter } from './utils.js'
import { serialize } from '../transformers/index.js'
import { Prisma } from '@prisma/client'
import {
  RelCreateDto,
  RelDto,
  RelUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/rel.js'
import { ReadParamsDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common.js'
import { ensureArray, OneOrMore } from 'tapestry-core/src/utils.js'
import { socketIdFromRequest, socketServer } from '../socket/index.js'
import { groupBy } from 'lodash-es'

export async function canViewRel(
  userId: string | null,
  relOrId: Prisma.RelGetPayload<{ include: { tapestry: true } }> | string,
) {
  const rel =
    typeof relOrId === 'string'
      ? await prisma.rel.findUniqueOrThrow({
          where: { id: relOrId },
          include: { tapestry: true },
        })
      : relOrId
  return canViewTapestry(userId, rel.tapestry)
}

export async function canEditRel(
  userId: string | null,
  relOrId: Prisma.RelGetPayload<{ include: { tapestry: true } }> | string,
) {
  const rel =
    typeof relOrId === 'string'
      ? await prisma.rel.findUniqueOrThrow({
          where: { id: relOrId },
          include: { tapestry: true },
        })
      : relOrId
  return canEditTapestry(userId, rel.tapestry)
}

export async function createRels(
  rel: RelCreateDto,
  context?: RequestContext<true>,
  query?: ReadParamsDto,
  tx?: Prisma.TransactionClient,
): Promise<RelDto>
export async function createRels(
  rels: RelCreateDto[],
  context?: RequestContext<true>,
  query?: ReadParamsDto,
  tx?: Prisma.TransactionClient,
): Promise<RelDto[]>
export async function createRels(
  rels: OneOrMore<RelCreateDto>,
  context?: RequestContext<true>,
  query?: ReadParamsDto,
  tx?: Prisma.TransactionClient,
) {
  // In case the method is called with an array with a single item, we still want to return an array.
  const shouldReturnSingleRecord = !Array.isArray(rels)

  const dbRels = await (tx ?? prisma).rel.createManyAndReturn({
    data: ensureArray(rels).map((rel) => relDtoToDb(rel, ['createdAt', 'updatedAt'])),
    include: parseIncludes('Rel', query?.include),
  })

  for (const tapestryId of new Set(dbRels.map((rel) => rel.tapestryId))) {
    void scheduleTapestryThumbnailGeneration(tapestryId)
    socketServer.notifyTapestryUpdate(
      tapestryId,
      context ? socketIdFromRequest(context.rawRequest) : undefined,
    )
  }

  const dtos = await serialize('Rel', dbRels)

  return shouldReturnSingleRecord ? dtos[0] : dtos
}

export async function updateRels(
  updates: Record<string, RelUpdateDto>,
  context: RequestContext<true>,
  query?: ReadParamsDto,
  tx?: Prisma.TransactionClient,
) {
  const updatedTapestries = new Set<string>()
  const rels = await ensureTransaction(tx, (tx) =>
    Promise.all(
      Object.entries(updates).map(async ([id, body]) => {
        const dbRel = await tx.rel.update({
          where: { id },
          data: relDtoToDb(body, ['id', 'createdAt', 'updatedAt']),
          include: parseIncludes('Rel', query?.include),
        })

        void scheduleTapestryThumbnailGeneration(dbRel.tapestryId)
        updatedTapestries.add(dbRel.tapestryId)

        return serialize('Rel', dbRel)
      }),
    ),
  )

  for (const tapestryId of updatedTapestries) {
    socketServer.notifyTapestryUpdate(tapestryId, socketIdFromRequest(context.rawRequest))
  }

  return rels
}

export function destroyRels(
  ids: OneOrMore<string>,
  context: RequestContext<true>,
  tx?: Prisma.TransactionClient,
) {
  return ensureTransaction(tx, async (tx) => {
    ids = ensureArray(ids)
    const rels = await tx.rel.findMany({
      where: { id: { in: ids } },
      select: { tapestryId: true, id: true },
    })

    const relsByTapestry = groupBy(rels, (r) => r.tapestryId)

    const payload = await tx.rel.deleteMany({ where: { id: { in: ids } } })

    for (const [tapestryId, tapestryRels] of Object.entries(relsByTapestry)) {
      void scheduleTapestryThumbnailGeneration(tapestryId)
      socketServer.notifyTapestryElementsRemoved(
        {
          ids: tapestryRels.map((r) => r.id),
          modelType: 'rels',
          tapestryId,
        },
        socketIdFromRequest(context.rawRequest),
      )
    }

    return payload
  })
}

export const rels: RESTResourceImpl<Resources['rels'], never> = {
  accessPolicy: {
    canCreate: ({ body: { tapestryId } }, { userId }) => canEditTapestry(userId, tapestryId),
    canRead: ({ pathParams: { id } }, { userId }) => canViewRel(userId, id),
    canUpdate: ({ pathParams: { id } }, { userId }) => canEditRel(userId, id),
    canDestroy: ({ pathParams: { id } }, { userId }) => canEditRel(userId, id),
    canList: ({ query: { filter } }, { userId }) => canListTapestryElements(filter, userId),
  },

  handlers: {
    create: ({ body, query }, context) => createRels(body, context, query),

    read: async ({ pathParams: { id }, query }) => {
      const dbRel = await prisma.rel.findUniqueOrThrow({
        where: { id },
        include: parseIncludes('Rel', query.include),
      })

      return serialize('Rel', dbRel)
    },

    update: async ({ pathParams: { id }, body, query }, context) =>
      (await updateRels({ [id]: body }, context, query))[0],

    destroy: async ({ pathParams: { id } }, context) => {
      await destroyRels(id, context)
    },

    list: async ({ query }) => {
      const filter = parseListFilter<Prisma.RelWhereInput>(query)
      const where = filter.where
      const total = await prisma.rel.count({ where })
      const rels = await prisma.rel.findMany({
        where,
        include: parseIncludes('Rel', query.include),
        orderBy: filter.orderBy,
        skip: filter.skip,
        take: filter.limit,
      })
      return {
        data: await serialize('Rel', rels),
        total,
        skip: filter.skip,
      }
    },
  },
}
