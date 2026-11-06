import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { serialize } from '../transformers/index.js'
import { canViewTapestry } from './tapestries.js'

// Exports are generated in the browser. The client records each successful export for reporting.
export const tapestryExports: RESTResourceImpl<Resources['tapestryExports'], never> = {
  accessPolicy: {
    canCreate: ({ body: { tapestryId } }, { userId }) => canViewTapestry(userId, tapestryId),
  },

  handlers: {
    create: async ({ body: { tapestryId } }, { userId }) =>
      serialize(
        'TapestryExport',
        await prisma.tapestryExport.create({ data: { tapestryId, userId } }),
      ),
  },
}
