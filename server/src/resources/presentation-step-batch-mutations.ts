import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { batchMutate, createBatchMutationsAccessPolicy } from './utils.js'
import {
  createPresentationSteps,
  destroyPresentationSteps,
  presentationSteps,
  updatePresentationSteps,
} from './presentation-steps.js'

export const presentationStepBatchMutations: RESTResourceImpl<
  Resources['presentationStepBatchMutations'],
  never
> = {
  accessPolicy: createBatchMutationsAccessPolicy(presentationSteps.accessPolicy),

  handlers: {
    create: async ({ body }, context) => {
      return batchMutate(body, {
        create: (data) => createPresentationSteps(data, context),
        update: (data) => updatePresentationSteps(data, context),
        destroy: (ids) => destroyPresentationSteps(ids, context),
        findByIds: (ids) =>
          prisma.presentationStep.findMany({
            where: { id: { in: ids } },
            select: { id: true },
          }),
      })
    },
  },
}
