import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { RESTResourceImpl } from './base-resource.js'
import { prisma } from '../db.js'
import { serialize } from '../transformers/index.js'
import { canViewTapestry } from './tapestries.js'
import { BadRequestError } from '../errors/index.js'

export const tapestryInteractions: RESTResourceImpl<Resources['tapestryInteractions'], never> = {
  accessPolicy: {
    canCreate: ({ body }, { userId }) => canViewTapestry(userId, body.tapestryId),
  },

  handlers: {
    create: async ({ body: { tapestryId, lastSeen, firstSeen } }, { userId }) => {
      if (firstSeen && firstSeen > lastSeen) {
        throw new BadRequestError()
      }

      const query = { userId, tapestryId }
      const update = { firstSeen: firstSeen ?? undefined, lastSeen }
      const interaction = await prisma.tapestryInteraction.upsert({
        where: { userId_tapestryId: query },
        create: { ...query, ...update, firstSeen: firstSeen ?? lastSeen },
        update,
      })

      return serialize('TapestryInteraction', interaction)
    },
  },
}
