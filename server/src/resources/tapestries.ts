import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { Prisma, Tapestry } from '@prisma/client'
import { RequestContext, RESTResourceImpl } from './base-resource.js'
import { tapestryDtoToDb } from '../transformers/tapestry.js'
import { checkOpSupport, CustomFilters, parseIncludes, parseListFilter } from './utils.js'
import { serialize } from '../transformers/index.js'
import { fromPairs, zip } from 'lodash-es'
import {
  TapestryCreateDto,
  TapestryDto,
  TapestryUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry.js'
import { queue } from '../tasks/index.js'
import { config } from '../config.js'
import { BadRequestError, ForbiddenError } from '../errors/index.js'
import { ListParamsOutputDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common.js'
import { createItems } from './items.js'
import { createRels } from './rels.js'
import { socketIdFromRequest, socketServer } from '../socket/index.js'

function sharedWithFilters(userId: string): Prisma.TapestryWhereInput[] {
  return [
    { userAccess: { some: { userId } } },
    { visibility: 'link', userInteractions: { some: { userId } } },
  ]
}

type CustomFilterProp = 'sharedWith' | 'bookmarkedBy'

const customFilters: CustomFilters<CustomFilterProp, Prisma.TapestryWhereInput> = {
  sharedWith: ({ op, value }) => {
    checkOpSupport({ op: 'eq', valueType: 'string' }, op, value)

    return { ownerId: { not: value }, OR: sharedWithFilters(value) }
  },
  bookmarkedBy: ({ op, value }) => {
    checkOpSupport({ op: 'eq', valueType: 'string' }, op, value)

    return { bookmarks: { some: { userId: value } } }
  },
}

async function fetchSeenTapestries(
  { where: tapestryWhere, include, orderBy, skip, take }: Prisma.TapestryFindManyArgs,
  userId: string,
  order: Prisma.SortOrder,
  orderInteractionBy: 'lastSeen' | 'firstSeen',
) {
  const tapestryOrdering = Array.isArray(orderBy) ? orderBy : [orderBy]
  const where: Prisma.TapestryInteractionWhereInput = { userId, tapestry: tapestryWhere }
  const tapestries = (
    await prisma.tapestryInteraction.findMany({
      where,
      include: { tapestry: { include } },
      orderBy: [
        { [orderInteractionBy]: order },
        ...tapestryOrdering.map((tapestryOrder) => ({ tapestry: tapestryOrder })),
      ],
      skip,
      take,
    })
  ).map((t) => t.tapestry)

  return {
    tapestries,
    total: () => prisma.tapestryInteraction.count({ where }),
  }
}

async function fetchUnseenTapestries(
  { where, ...args }: Prisma.TapestryFindManyArgs,
  userId: string,
) {
  const augmentedWhere: Prisma.TapestryWhereInput = {
    ...where,
    userInteractions: { none: { userId } },
  }

  return {
    tapestries: await prisma.tapestry.findMany({ where: augmentedWhere, ...args }),
    total: () => prisma.tapestry.count({ where: augmentedWhere }),
  }
}

async function orderByInteraction(
  { skip, take, ...args }: Prisma.TapestryFindManyArgs & { skip: number; take: number },
  userId: string,
  order: Prisma.SortOrder,
  orderInteractionBy: 'lastSeen' | 'firstSeen',
) {
  const [fetchFirst, fetchSecond] =
    order === 'desc'
      ? ([fetchSeenTapestries, fetchUnseenTapestries] as const)
      : ([fetchUnseenTapestries, fetchSeenTapestries] as const)

  const { tapestries, total } = await fetchFirst(
    { skip, take, ...args },
    userId,
    order,
    orderInteractionBy,
  )

  if (tapestries.length < take) {
    const skipped = tapestries.length > 0 ? skip : await total()
    const { tapestries: other } = await fetchSecond(
      {
        ...args,
        skip: skip - skipped,
        take: take - tapestries.length,
      },
      userId,
      order,
      orderInteractionBy,
    )
    tapestries.push(...other)
  }

  return tapestries
}

export async function scheduleTapestryThumbnailGeneration(tapestryId: string) {
  await queue.remove(tapestryId)
  await queue.add(
    'generate-tapestry-thumbnail',
    { tapestryId },
    {
      jobId: tapestryId,
      delay: config.worker.tapestryThumbnailGenerationDelay,
      removeOnComplete: true,
      removeOnFail: true,
    },
  )
}

function fecthTapestryByPathSegment(
  segment: string,
  args?: Omit<Prisma.TapestryFindFirstOrThrowArgs, 'where'>,
) {
  const components = segment.split('/')
  const where: Prisma.TapestryWhereInput =
    components.length === 1
      ? { id: components[0] }
      : {
          slug: components[1],
          owner: {
            username: components[0],
          },
        }

  return prisma.tapestry.findFirstOrThrow({
    ...args,
    where,
  })
}

export async function canViewTapestry(
  userId: string | null,
  tapestryOrId: Prisma.TapestryGetPayload<null> | string,
) {
  const tapestry =
    typeof tapestryOrId === 'string'
      ? await prisma.tapestry.findUniqueOrThrow({ where: { id: tapestryOrId } })
      : tapestryOrId

  if (tapestry.visibility !== 'private' || tapestry.ownerId === userId) return true

  if (!userId) return false

  return !!(await prisma.tapestryAccess.findFirst({ where: { tapestryId: tapestry.id, userId } }))
}

export async function canEditTapestry(
  userId: string | null,
  tapestryOrId: Prisma.TapestryGetPayload<null> | string,
) {
  if (!userId) return false

  const tapestry =
    typeof tapestryOrId === 'string'
      ? await prisma.tapestry.findUniqueOrThrow({ where: { id: tapestryOrId } })
      : tapestryOrId

  if (tapestry.ownerId === userId) return true

  return !!(await prisma.tapestryAccess.findFirst({
    where: { tapestryId: tapestry.id, userId, canEdit: true },
  }))
}

async function canUpdateTapestry(userId: string, tapestryId: string, update: TapestryUpdateDto) {
  const tapestry = await prisma.tapestry.findUniqueOrThrow({ where: { id: tapestryId } })
  if (
    (update.visibility || update.title || update.description || update.allowForking) &&
    tapestry.ownerId !== userId
  ) {
    throw new ForbiddenError(
      'Only the owner can change the tapestry visibility, title, description or forking permissions',
    )
  }
  return canEditTapestry(userId, tapestry)
}

async function ownsTapestry(userId: string, tapestryId: string) {
  return !!(await prisma.tapestry.findUnique({ where: { id: tapestryId, ownerId: userId } }))
}

function createTapestriesListFilter(userId: string | null): Prisma.TapestryWhereInput {
  return {
    OR: [
      { visibility: 'public' },
      ...(userId ? [{ ownerId: userId }, ...sharedWithFilters(userId)] : []),
    ],
  }
}

export async function canListTapestryElements(
  filter: ListParamsOutputDto['filter'],
  userId: string | null,
) {
  const tapestryId = filter?.find(({ prop, op }) => prop === 'tapestryId' && op === 'eq')?.value as
    | string
    | undefined

  if (!tapestryId) return false

  return canViewTapestry(userId, tapestryId)
}

export async function createTapestry(
  createParams: TapestryCreateDto,
  authorId: string,
  context?: RequestContext<true>,
) {
  if (createParams.visibility === 'public') {
    throw new ForbiddenError('Public tapestries are not allowed')
  }

  const newTapestryId = crypto.randomUUID()
  await prisma.$transaction(async (tx) => {
    const createInput: Prisma.TapestryCreateInput = {
      id: newTapestryId,
      slug: createParams.slug || newTapestryId,
      ...tapestryDtoToDb(createParams as TapestryDto, [
        'id',
        'slug',
        'createdAt',
        'updatedAt',
        'ownerId',
        'parentId',
      ]),
      owner: { connect: { id: authorId } },
      parent: { connect: createParams.parentId ? { id: createParams.parentId } : undefined },
    }

    const { id } = await tx.tapestry.create({ data: createInput, select: { id: true } })

    const items = await createItems(
      createParams.items.map((dto) => ({ ...dto, tapestryId: id })),
      context,
      undefined,
      tx,
    )

    const itemIdMap = fromPairs(
      zip(createParams.items, items).map(([dto, db]) => [dto!.id, db!.id]),
    )

    await createRels(
      createParams.rels.map((rel) => ({
        ...rel,
        tapestryId: id,
        fromItemId: itemIdMap[rel.from.itemId],
        toItemId: itemIdMap[rel.to.itemId],
      })),
      context,
      undefined,
      tx,
    )

    return id
  })

  void scheduleTapestryThumbnailGeneration(newTapestryId)

  return newTapestryId
}

export const tapestries: RESTResourceImpl<Resources['tapestries'], Prisma.TapestryWhereInput> = {
  accessPolicy: {
    canCreate: (_, { userId }) => Promise.resolve(!!userId),
    canRead: async ({ pathParams: { id } }, { userId }) =>
      canViewTapestry(userId, await fecthTapestryByPathSegment(id)),
    canUpdate: ({ pathParams: { id }, body }, { userId }) => canUpdateTapestry(userId, id, body),
    canDestroy: ({ pathParams: { id } }, { userId }) => ownsTapestry(userId, id),
    canList: () => Promise.resolve(true),
    createListFilter: (userId) => createTapestriesListFilter(userId),
  },

  handlers: {
    create: async ({ body, query }, context) => {
      const newTapestryId = await createTapestry(body, context.userId, context)

      const dbTapestry = await prisma.tapestry.findUniqueOrThrow({
        where: { id: newTapestryId },
        include: parseIncludes('Tapestry', query.include),
      })

      return serialize('Tapestry', dbTapestry)
    },

    read: async ({ pathParams: { id }, query }) => {
      return serialize(
        'Tapestry',
        await fecthTapestryByPathSegment(id, { include: parseIncludes('Tapestry', query.include) }),
      )
    },

    update: async ({ pathParams: { id }, query, body: tapestry }, context) => {
      if (tapestry.visibility === 'public') {
        throw new ForbiddenError('Public tapestries are not allowed')
      }

      const patch: Prisma.TapestryUpdateInput = tapestryDtoToDb(tapestry, [
        'id',
        'slug',
        'createdAt',
        'updatedAt',
      ])
      if (tapestry.slug) {
        // Update the slug only if it's a non-empty string
        patch.slug = tapestry.slug
      }
      await prisma.tapestry.update({
        where: { id },
        data: patch,
      })

      const dbTapestry = await prisma.tapestry.findUniqueOrThrow({
        where: { id },
        include: parseIncludes('Tapestry', query.include),
      })

      socketServer.notifyTapestryUpdate(id, socketIdFromRequest(context.rawRequest))

      void scheduleTapestryThumbnailGeneration(id)

      return serialize('Tapestry', dbTapestry)
    },

    destroy: async ({ pathParams: { id } }) => {
      await prisma.$transaction(async (tx) => {
        await tx.presentationStep.deleteMany({
          where: {
            OR: [{ item: { tapestryId: id } }, { group: { tapestryId: id } }],
          },
        })
        await tx.tapestry.delete({ where: { id } })
      })
    },

    list: async ({ query }, { listFilter, userId }) => {
      const { where: whereFilter, limit, orderBy, skip } = parseListFilter(query, customFilters)
      const where = { ...whereFilter, ...listFilter }
      const total = await prisma.tapestry.count({ where })

      const tapestryFindManyArgs = {
        where,
        include: parseIncludes('Tapestry', query.include),
        orderBy,
        skip,
        take: limit,
      } satisfies Prisma.TapestryFindManyArgs

      let tapestries: Tapestry[]
      const orderByInteractionTime = (['firstSeen', 'lastSeen'] as const).find(
        (field) => field in tapestryFindManyArgs.orderBy,
      )
      if (orderByInteractionTime) {
        if (!userId) {
          throw new BadRequestError('Only authenticated users can sort by interaction time')
        }

        const order = tapestryFindManyArgs.orderBy[orderByInteractionTime]
        delete tapestryFindManyArgs.orderBy[orderByInteractionTime]
        tapestries = await orderByInteraction(
          tapestryFindManyArgs,
          userId,
          order,
          orderByInteractionTime,
        )
      } else {
        tapestries = await prisma.tapestry.findMany(tapestryFindManyArgs)
      }

      return {
        data: await serialize('Tapestry', tapestries),
        total,
        skip,
      }
    },
  },
}
