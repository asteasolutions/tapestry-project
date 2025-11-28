import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { Prisma, TapestryCreateJob } from '@prisma/client'
import { RESTResourceImpl } from './base-resource.js'
import { parseListFilter } from './utils.js'
import { serialize } from '../transformers/index.js'
import { queue } from '../tasks/index.js'
import { TapestryCreateJobCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry-create-job.js'
import { canEditTapestry, canViewTapestry } from './tapestries.js'

async function canCreateTapestryCreateJob(userId: string, body: TapestryCreateJobCreateDto) {
  if (body.type === 'import') {
    return true
  }
  const tapestry = await prisma.tapestry.findUniqueOrThrow({
    where: { id: body.parentId },
  })
  return (
    (await canEditTapestry(userId, tapestry)) ||
    (tapestry.allowForking && (await canViewTapestry(userId, tapestry)))
  )
}

function scheduleJob({ id }: TapestryCreateJob) {
  return queue.add(
    'create-tapestry',
    { tapestryCreateJobId: id },
    {
      removeOnComplete: true,
      removeOnFail: true,
      jobId: id,
    },
  )
}

export const tapestryCreateJobs: RESTResourceImpl<
  Resources['tapestryCreateJob'],
  Prisma.TapestryCreateJobWhereInput
> = {
  accessPolicy: {
    canCreate: ({ body }, { userId }) => canCreateTapestryCreateJob(userId, body),
    canRead: async ({ pathParams: { id } }, { userId }) => {
      await prisma.tapestryCreateJob.findUniqueOrThrow({
        where: {
          id,
          userId,
        },
      })
      return true
    },
    canList: () => Promise.resolve(true),
    createListFilter: (userId) => ({ userId: userId! }),
  },

  handlers: {
    create: async ({ body }, { userId }) => {
      const job = await prisma.tapestryCreateJob.create({
        data: {
          ...body,
          userId,
          progress: 0,
          status: 'pending',
        },
      })
      void scheduleJob(job)
      return serialize('TapestryCreateJob', job)
    },

    read: async ({ pathParams: { id } }) => {
      const dbTapestry = await prisma.tapestryCreateJob.findUniqueOrThrow({
        where: { id },
      })

      return serialize('TapestryCreateJob', dbTapestry)
    },

    list: async ({ query }, { listFilter }) => {
      const filter = parseListFilter<Prisma.TapestryCreateJobWhereInput>(query)
      const where = { ...filter.where, ...listFilter }
      const total = await prisma.tapestryCreateJob.count({ where })
      const jobs = await prisma.tapestryCreateJob.findMany({
        where,
        orderBy: filter.orderBy,
        skip: filter.skip,
        take: filter.limit,
      })
      return {
        data: await serialize('TapestryCreateJob', jobs),
        total,
        skip: filter.skip,
      }
    },
  },
}
