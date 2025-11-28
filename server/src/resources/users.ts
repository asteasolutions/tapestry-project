import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { parseIncludes } from './utils.js'
import { serialize } from '../transformers/index.js'

export const users: RESTResourceImpl<Resources['users'], never> = {
  accessPolicy: {
    canRead: ({ pathParams: { id } }, { userId }) => Promise.resolve(id === userId),
  },

  handlers: {
    read: async ({ pathParams: { id }, query }) => {
      const dbUser = await prisma.user.findUniqueOrThrow({
        where: { id },
        include: parseIncludes('User', query.include),
      })
      return serialize('User', dbUser)
    },
  },
}
