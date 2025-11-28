import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { batchMutate, createBatchMutationsAccessPolicy } from './utils.js'
import { createGroups, destroyGroups, groups, updateGroups } from './groups.js'

export const groupBatchMutations: RESTResourceImpl<Resources['groupBatchMutations'], never> = {
  accessPolicy: createBatchMutationsAccessPolicy(groups.accessPolicy),

  handlers: {
    create: async ({ body }, context) => {
      return batchMutate(body, {
        create: (data) => createGroups(data, context),
        update: (data) => updateGroups(data, context),
        destroy: (ids) => destroyGroups(ids, context),
        findByIds: (ids) =>
          prisma.group.findMany({
            where: { id: { in: ids } },
            select: { id: true },
          }),
      })
    },
  },
}
