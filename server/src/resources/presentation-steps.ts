import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { ensureTransaction, prisma } from '../db.js'
import { RequestContext, RESTResourceImpl } from './base-resource.js'
import { canEditTapestry, canListTapestryElements, canViewTapestry } from './tapestries.js'
import { checkOpSupport, CustomFilters, parseIncludes, parseListFilter } from './utils.js'
import { serialize } from '../transformers/index.js'
import { PresentationStep, Prisma } from '@prisma/client'
import { canEditItem } from './items.js'
import { ensureArray, IdMap, OneOrMore } from 'tapestry-core/src/utils.js'
import {
  PresentationStepCreateDto,
  PresentationStepDto,
  PresentationStepUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step.js'
import { ReadParamsDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common.js'
import { ServerError } from '../errors/index.js'
import { canEditGroup } from './groups.js'
import { presentationStepDtoToDb } from '../transformers/presentation-steps.js'
import { socketIdFromRequest, socketServer } from '../socket/index.js'
import { groupBy } from 'lodash-es'

type CustomFilterProp = 'tapestryId'

const customFilters: CustomFilters<CustomFilterProp, Prisma.PresentationStepWhereInput> = {
  tapestryId: ({ op, value }) => {
    checkOpSupport({ op: 'eq', valueType: 'string' }, op, value)

    return { OR: [{ item: { tapestryId: value } }, { group: { tapestryId: value } }] }
  },
}

function getTapestryId(
  step: Prisma.PresentationStepGetPayload<{
    select: { item: { select: { tapestryId: true } }; group: { select: { tapestryId: true } } }
  }>,
) {
  const tapestryId = step.item?.tapestryId ?? step.group?.tapestryId
  if (!tapestryId) throw new ServerError('Corrupted data')

  return tapestryId
}

async function fetchTapestryIds(stepIds: string[]) {
  const steps = await prisma.presentationStep.findMany({
    where: { id: { in: stepIds } },
    select: {
      item: { select: { tapestryId: true } },
      group: { select: { tapestryId: true } },
    },
  })

  return new Set(steps.map((step) => getTapestryId(step)))
}

async function canViewPresentationStep(
  userId: string | null,
  stepOrId: Prisma.PresentationStepGetPayload<{ select: { item: true; group: true } }> | string,
) {
  const step =
    typeof stepOrId === 'string'
      ? await prisma.presentationStep.findUniqueOrThrow({
          where: { id: stepOrId },
          select: {
            item: { select: { tapestryId: true } },
            group: { select: { tapestryId: true } },
          },
        })
      : stepOrId
  return canViewTapestry(userId, getTapestryId(step))
}

export async function canEditPresentationStep(
  userId: string | null,
  stepOrId: Prisma.PresentationStepGetPayload<{ select: { item: true; group: true } }> | string,
) {
  const step =
    typeof stepOrId === 'string'
      ? await prisma.presentationStep.findUniqueOrThrow({
          where: { id: stepOrId },
          select: {
            item: { select: { tapestryId: true } },
            group: { select: { tapestryId: true } },
          },
        })
      : stepOrId
  return canEditTapestry(userId, getTapestryId(step))
}

export async function createPresentationSteps(
  presentationStep: PresentationStepCreateDto,
  context: RequestContext<true>,
  query?: ReadParamsDto,
): Promise<PresentationStepDto>
export async function createPresentationSteps(
  presentationSteps: PresentationStepCreateDto[],
  context: RequestContext<true>,
  query?: ReadParamsDto,
): Promise<PresentationStepDto[]>
export async function createPresentationSteps(
  presentationSteps: OneOrMore<PresentationStepCreateDto>,
  context: RequestContext<true>,
  query?: ReadParamsDto,
) {
  // In case the method is called with an array with a single item, we still want to return an array.
  const shouldReturnSingleRecord = !Array.isArray(presentationSteps)

  const dbSteps = await prisma.presentationStep.createManyAndReturn({
    data: ensureArray(presentationSteps).map((dto) => presentationStepDtoToDb(dto)),
    include: parseIncludes('PresentationStep', query?.include),
  })

  for (const id of await fetchTapestryIds(dbSteps.map((step) => step.id))) {
    socketServer.notifyTapestryUpdate(id, socketIdFromRequest(context.rawRequest))
  }

  const dtos = await serialize('PresentationStep', dbSteps)
  return shouldReturnSingleRecord ? dtos[0] : dtos
}

export async function updatePresentationSteps(
  updates: Record<string, PresentationStepUpdateDto>,
  context: RequestContext<true>,
  query?: ReadParamsDto,
) {
  const steps = await prisma.$transaction((tx) =>
    Promise.all(
      Object.entries(updates).map(async ([id, body]) => {
        const dbPresentationStep = await tx.presentationStep.update({
          where: { id },
          data: presentationStepDtoToDb(body),
          include: parseIncludes('PresentationStep', query?.include),
        })

        return serialize('PresentationStep', dbPresentationStep)
      }),
    ),
  )

  for (const tapestryId of await fetchTapestryIds(Object.keys(updates))) {
    socketServer.notifyTapestryUpdate(tapestryId, socketIdFromRequest(context.rawRequest))
  }

  return steps
}

export async function destroyPresentationSteps(
  ids: OneOrMore<string>,
  context: RequestContext<true>,
  tx?: Prisma.TransactionClient,
) {
  let stepsByTapestryId: IdMap<PresentationStep[]> = {}

  const payload = await ensureTransaction(tx, async (tx) => {
    ids = ensureArray(ids)
    const steps = await tx.presentationStep.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        item: { select: { tapestryId: true } },
        group: { select: { tapestryId: true } },
      },
    })

    for (const step of steps) {
      await tx.presentationStep.updateMany({
        where: { prevStepId: step.id },
        data: { prevStepId: step.prevStepId },
      })
    }

    stepsByTapestryId = groupBy(steps, (step) => getTapestryId(step))

    return tx.presentationStep.deleteMany({ where: { id: { in: ids } } })
  })

  for (const [tapestryId, tapestrySteps] of Object.entries(stepsByTapestryId)) {
    socketServer.notifyTapestryUpdate(
      {
        tapestryId,
        deletedIds: {
          presentationSteps: tapestrySteps!.map((s) => s.id),
        },
      },
      socketIdFromRequest(context.rawRequest),
    )
  }

  return payload
}

export const presentationSteps: RESTResourceImpl<Resources['presentationSteps'], never> = {
  accessPolicy: {
    canCreate: ({ body }, { userId }) =>
      body.type === 'item' ? canEditItem(userId, body.itemId) : canEditGroup(userId, body.groupId),
    canRead: ({ pathParams: { id } }, { userId }) => canViewPresentationStep(userId, id),
    canUpdate: ({ pathParams: { id } }, { userId }) => canEditPresentationStep(userId, id),
    canDestroy: ({ pathParams: { id } }, { userId }) => canEditPresentationStep(userId, id),
    canList: ({ query: { filter } }, { userId }) => canListTapestryElements(filter, userId),
  },

  handlers: {
    create: ({ body, query }, context) => createPresentationSteps(body, context, query),

    read: async ({ pathParams: { id }, query }) => {
      const dbStep = await prisma.presentationStep.findUniqueOrThrow({
        where: { id },
        include: parseIncludes('PresentationStep', query.include),
      })

      return serialize('PresentationStep', dbStep)
    },

    update: async ({ pathParams: { id }, body, query }, context) =>
      (await updatePresentationSteps({ [id]: body }, context, query))[0],

    destroy: async ({ pathParams: { id } }, context) => {
      await destroyPresentationSteps(id, context)
    },

    list: async ({ query }) => {
      const { where, limit, orderBy, skip } = parseListFilter(query, customFilters)
      const total = await prisma.presentationStep.count({ where })

      const presentationSteps = await prisma.presentationStep.findMany({
        where,
        include: parseIncludes('PresentationStep', query.include),
        orderBy,
        skip,
        take: limit,
      })

      return {
        data: await serialize('PresentationStep', presentationSteps),
        total,
        skip,
      }
    },
  },
}
