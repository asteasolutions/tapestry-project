import { getCopyName, IdMap, isHTTPURL } from 'tapestry-core/src/utils.js'
import { JobTypeMap } from './index.js'
import { prisma } from '../db.js'
import { generateItemKey, s3Service, tapestryKey } from '../services/s3-service.js'
import { Prisma, PrismaClient, TapestryCreateJob } from '@prisma/client'
import { ITXClientDenyList } from '@prisma/client/runtime/library'
import { omit, fromPairs, zip, sumBy } from 'lodash-es'
import { TapestryImportService } from '../services/tapestry-import-service.js'

export async function createTapestry({ tapestryCreateJobId }: JobTypeMap['create-tapestry']) {
  const job = await prisma.tapestryCreateJob.findFirstOrThrow({
    where: { id: tapestryCreateJobId },
  })
  if (job.type === 'fork') {
    await forkTapestry(job)
  }
  if (job.type === 'import') {
    await new TapestryImportService(job).import()
  }
}

async function forkTapestry(job: TapestryCreateJob) {
  const { parentId, userId, title, description } = job
  const newKeys: string[] = []
  try {
    await prisma.tapestryCreateJob.update({ where: { id: job.id }, data: { status: 'processing' } })

    const tapestry = await prisma.tapestry.findUniqueOrThrow({
      where: { id: parentId! },
      include: {
        items: true,
        rels: true,
        groups: true,
      },
    })

    const total =
      (tapestry.thumbnail ? 1 : 0) +
      sumBy(tapestry.items, (i) => (i.source && !isHTTPURL(i.source) ? 1 : 0)) +
      1
    let progress = 0

    await prisma.$transaction(
      async (tx) => {
        const uploadObject = async (src: string, dest: string) => {
          await s3Service.copyObject(src, dest)
          newKeys.push(dest)
          ++progress
          await prisma.tapestryCreateJob.update({
            where: { id: job.id },
            data: { progress: progress / total },
          })
        }

        const newTapestryId = await cloneTapestry(tapestry, title, description, userId, tx)

        const groupIdMap = await cloneGroups(tapestry.groups, newTapestryId, tx)

        if (tapestry.thumbnail) {
          const thumbnail = tapestryKey(newTapestryId, 'thumbnail.jpeg')
          await uploadObject(tapestry.thumbnail, thumbnail)
          await tx.tapestry.update({ where: { id: newTapestryId }, data: { thumbnail } })
        }

        for (const item of tapestry.items) {
          if (item.source !== null && !isHTTPURL(item.source)) {
            const newKey = generateItemKey(newTapestryId, item.source)
            await uploadObject(item.source, newKey)
            item.source = newKey
          }
        }

        const itemIdMap = await cloneItems(tapestry.items, newTapestryId, tx, groupIdMap)

        await cloneRels(tapestry.rels, newTapestryId, tx, itemIdMap)

        await tx.tapestryCreateJob.update({
          where: { id: job.id },
          data: { status: 'complete', progress: 1, tapestryId: newTapestryId },
        })
        return newTapestryId
      },
      {
        timeout: 10 * 60 * 60 * 1000,
      },
    )
  } catch (error) {
    console.error(`Error while forking tapestry with id ${parentId} in job ${job.id}`, error)
    await prisma.tapestryCreateJob.update({
      where: { id: job.id },
      data: { status: 'failed', progress: 1 },
    })
    await Promise.all(newKeys.map((key) => s3Service.tryDeleteObject(key)))
  }
}

async function cloneTapestry(
  tapestry: Prisma.TapestryGetPayload<null>,
  title: string | null,
  description: string | null,
  userId: string,
  tx: Omit<PrismaClient, ITXClientDenyList>,
): Promise<string> {
  const tapestryId = crypto.randomUUID()

  const createInput: Prisma.TapestryCreateInput = {
    ...omit(
      tapestry,
      'items',
      'rels',
      'groups',
      'id',
      'slug',
      'createdAt',
      'updatedAt',
      'ownerId',
      'parentId',
      'visibility',
    ),
    id: tapestryId,
    slug: tapestryId,
    title: title ?? getCopyName(tapestry.title),
    description: description,
    owner: { connect: { id: userId } },
    parent: { connect: { id: tapestry.id } },
  }

  await tx.tapestry.create({ data: createInput })

  return tapestryId
}

async function cloneGroups(
  groups: Prisma.GroupGetPayload<null>[],
  newTapestryId: string,
  tx: Omit<PrismaClient, ITXClientDenyList>,
) {
  const newGroups = await tx.group.createManyAndReturn({
    data: groups.map((group) => ({
      ...omit(group, ['id', 'createdAt', 'updatedAt', 'tapestryId']),
      tapestryId: newTapestryId,
    })),
    select: { id: true },
  })

  return fromPairs(zip(groups, newGroups).map(([dto, db]) => [dto!.id, db!.id]))
}

async function cloneItems(
  items: Prisma.ItemGetPayload<null>[],
  newTapestryId: string,
  tx: Omit<PrismaClient, ITXClientDenyList>,
  groupIdMap: IdMap<string>,
): Promise<IdMap<string>> {
  const newItems = await tx.item.createManyAndReturn({
    data: items.map((item) => ({
      ...omit(item, ['id', 'createdAt', 'updatedAt', 'tapestryId', 'groupId']),
      groupId: groupIdMap[item.groupId ?? ''],
      tapestryId: newTapestryId,
    })),
    select: { id: true },
  })

  return fromPairs(zip(items, newItems).map(([dto, db]) => [dto!.id, db!.id]))
}

async function cloneRels(
  rels: Prisma.RelGetPayload<null>[],
  newTapestryId: string,
  tx: Omit<PrismaClient, ITXClientDenyList>,
  itemIdMap: IdMap<string>,
) {
  await tx.rel.createMany({
    data: rels.map((rel) => ({
      ...omit(rel, ['id', 'createdAt', 'updatedAt', 'tapestryId', 'fromItemId', 'toItemId']),
      tapestryId: newTapestryId,
      fromItemId: itemIdMap[rel.fromItemId]!,
      toItemId: itemIdMap[rel.toItemId]!,
    })),
  })
}
