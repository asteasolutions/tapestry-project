import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { createItems, destroyItems, items, updateItems } from './items.js'
import { batchMutate, createBatchMutationsAccessPolicy } from './utils.js'

export const itemBatchMutations: RESTResourceImpl<Resources['itemBatchMutations'], never> = {
  accessPolicy: createBatchMutationsAccessPolicy(items.accessPolicy),

  handlers: {
    create: async ({ body }, context) => {
      return batchMutate(body, {
        create: (data) => createItems(data, context),
        update: (updates) => updateItems(updates, context),
        destroy: (ids) => destroyItems(ids, context),
        findByIds: (ids) =>
          prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true } }),
      })
    },
  },
}
