import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { batchMutate, createBatchMutationsAccessPolicy } from './utils.js'
import { createRels, destroyRels, rels, updateRels } from './rels.js'

export const relBatchMutations: RESTResourceImpl<Resources['relBatchMutations'], never> = {
  accessPolicy: createBatchMutationsAccessPolicy(rels.accessPolicy),

  handlers: {
    create: async ({ body }, context) => {
      return batchMutate(body, {
        create: (data) => createRels(data, context),
        update: (updates) => updateRels(updates, context),
        destroy: (ids) => destroyRels(ids, context),
        findByIds: (ids) =>
          prisma.rel.findMany({
            where: { id: { in: ids } },
            select: { id: true },
          }),
      })
    },
  },
}
