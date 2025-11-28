import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { ensureTransaction, prisma } from '../db.js'
import { RequestContext, RESTResourceImpl } from './base-resource.js'
import {
  canEditTapestry,
  canListTapestryElements,
  canViewTapestry,
  scheduleTapestryThumbnailGeneration,
} from './tapestries.js'
import { parseIncludes, parseListFilter } from './utils.js'
import { serialize } from '../transformers/index.js'
import { Group, Prisma } from '@prisma/client'
import {
  GroupCreateDto,
  GroupDto,
  GroupUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/group.js'
import { ReadParamsDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common.js'
import { ensureArray, OneOrMore } from 'tapestry-core/src/utils.js'
import { destroyPresentationSteps } from './presentation-steps.js'
import { socketIdFromRequest, socketServer } from '../socket/index.js'
import { groupBy } from 'lodash-es'

export function shouldGroupRegenerateTapestryThumbnail(group: Group, patch?: Partial<Group>) {
  if (!patch) return group.color && (group.hasBackground || group.hasBorder)

  return (
    patch.color !== group.color ||
    (patch.color &&
      (patch.hasBackground !== group.hasBackground || patch.hasBorder !== group.hasBorder))
  )
}

export async function canViewGroup(
  userId: string | null,
  groupOrId: Prisma.GroupGetPayload<{ include: { tapestry: true } }> | string,
) {
  const group =
    typeof groupOrId === 'string'
      ? await prisma.group.findUniqueOrThrow({
          where: { id: groupOrId },
          include: { tapestry: true },
        })
      : groupOrId
  return canViewTapestry(userId, group.tapestry)
}

export async function canEditGroup(
  userId: string | null,
  groupOrId: Prisma.GroupGetPayload<{ include: { tapestry: true } }> | string,
) {
  const group =
    typeof groupOrId === 'string'
      ? await prisma.group.findUniqueOrThrow({
          where: { id: groupOrId },
          include: { tapestry: true },
        })
      : groupOrId
  return canEditTapestry(userId, group.tapestry)
}

export async function createGroups(
  group: GroupCreateDto,
  context: RequestContext<true>,
  query?: ReadParamsDto,
): Promise<GroupDto>
export async function createGroups(
  groups: GroupCreateDto[],
  context: RequestContext<true>,
  query?: ReadParamsDto,
): Promise<GroupDto[]>
export async function createGroups(
  groups: OneOrMore<GroupCreateDto>,
  context: RequestContext<true>,
  query?: ReadParamsDto,
) {
  // In case the method is called with an array with a single item, we still want to return an array.
  const shouldReturnSingleRecord = !Array.isArray(groups)

  const dbGroups = await prisma.group.createManyAndReturn({
    data: ensureArray(groups),
    include: parseIncludes('Group', query?.include),
  })

  dbGroups
    .filter((group) => shouldGroupRegenerateTapestryThumbnail(group))
    .forEach((group) => scheduleTapestryThumbnailGeneration(group.tapestryId))

  for (const id of new Set(dbGroups.map((g) => g.tapestryId))) {
    socketServer.notifyTapestryUpdate(id, socketIdFromRequest(context.rawRequest))
  }

  const dtos = await serialize('Group', dbGroups)
  return shouldReturnSingleRecord ? dtos[0] : dtos
}

export async function updateGroups(
  updates: Record<string, GroupUpdateDto>,
  context: RequestContext<true>,
  query?: ReadParamsDto,
) {
  const updatedTapestries = new Set<string>()

  const groups = await prisma.$transaction((tx) =>
    Promise.all(
      Object.entries(updates).map(async ([id, update]) => {
        const dbGroup = await tx.group.update({
          where: { id },
          data: update,
          include: parseIncludes('Group', query?.include),
        })

        if (shouldGroupRegenerateTapestryThumbnail(dbGroup, update)) {
          void scheduleTapestryThumbnailGeneration(dbGroup.tapestryId)
        }

        updatedTapestries.add(dbGroup.tapestryId)

        return serialize('Group', dbGroup)
      }),
    ),
  )

  for (const tapestryId of updatedTapestries) {
    socketServer.notifyTapestryUpdate(tapestryId, socketIdFromRequest(context.rawRequest))
  }

  return groups
}

export function destroyGroups(
  ids: OneOrMore<string>,
  context: RequestContext<true>,
  tx?: Prisma.TransactionClient,
) {
  return ensureTransaction(tx, async (tx) => {
    ids = ensureArray(ids)
    const presentationSteps = await tx.presentationStep.findMany({
      where: { groupId: { in: ids } },
    })
    await destroyPresentationSteps(
      presentationSteps.map((step) => step.id, tx),
      context,
    )

    const groups = await tx.group.findMany({
      where: { id: { in: ids } },
    })
    const groupsByTapestry = groupBy(groups, (i) => i.tapestryId)

    const payload = await tx.group.deleteMany({ where: { id: { in: ids } } })

    for (const [tapestryId, tapestryGroups] of Object.entries(groupsByTapestry)) {
      if (tapestryGroups.some((group) => shouldGroupRegenerateTapestryThumbnail(group))) {
        void scheduleTapestryThumbnailGeneration(tapestryId)
      }

      socketServer.notifyTapestryElementsRemoved(
        {
          ids: tapestryGroups.map((g) => g.id),
          modelType: 'groups',
          tapestryId,
        },
        socketIdFromRequest(context.rawRequest),
      )
    }

    return payload
  })
}

export const groups: RESTResourceImpl<Resources['groups'], never> = {
  accessPolicy: {
    canCreate: ({ body: { tapestryId } }, { userId }) => canEditTapestry(userId, tapestryId),
    canRead: ({ pathParams: { id } }, { userId }) => canViewGroup(userId, id),
    canUpdate: ({ pathParams: { id } }, { userId }) => canEditGroup(userId, id),
    canDestroy: ({ pathParams: { id } }, { userId }) => canEditGroup(userId, id),
    canList: ({ query: { filter } }, { userId }) => canListTapestryElements(filter, userId),
  },

  handlers: {
    create: async ({ body, query }, context) => createGroups(body, context, query),

    read: async ({ pathParams: { id }, query }) => {
      const dbGroup = await prisma.group.findUniqueOrThrow({
        where: { id },
        include: parseIncludes('Group', query.include),
      })

      return serialize('Group', dbGroup)
    },

    update: async ({ pathParams: { id }, body, query }, context) =>
      (await updateGroups({ [id]: body }, context, query))[0],

    destroy: async ({ pathParams: { id } }, context) => {
      await destroyGroups(id, context)
    },

    list: async ({ query }) => {
      const filter = parseListFilter<Prisma.GroupWhereInput>(query)
      const where = filter.where
      const total = await prisma.group.count({ where })
      const groups = await prisma.group.findMany({
        where,
        include: parseIncludes('Group', query.include),
        orderBy: filter.orderBy,
        skip: filter.skip,
        take: filter.limit,
      })
      return {
        data: await serialize('Group', groups),
        total,
        skip: filter.skip,
      }
    },
  },
}
