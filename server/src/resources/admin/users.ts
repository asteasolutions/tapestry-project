import { Prisma } from '@prisma/client'
import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../../db.js'
import { RESTResourceImpl } from '../base-resource.js'
import { parseListFilter } from '../utils.js'
import { adminOnly } from '../../auth/roles.js'
import { ConflictError } from '../../errors/index.js'
import { adminUserDbToDto, adminUserInclude } from '../../transformers/admin.js'
import { adminUserFilters } from './filters.js'
import { logAdminActivity } from '../../services/admin-activity.js'

export const adminUsers: RESTResourceImpl<Resources['adminUsers'], Prisma.UserWhereInput> = {
  accessPolicy: {
    canUpdate: adminOnly,
    canList: adminOnly,
    createListFilter: () => ({}),
  },

  handlers: {
    list: async ({ query }) => {
      const { where, skip, limit, orderBy } = parseListFilter<
        Prisma.UserWhereInput,
        keyof typeof adminUserFilters
      >({ ...query, orderBy: query.orderBy ?? { createdAt: 'desc' } }, adminUserFilters)

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: [orderBy, { id: 'asc' }],
          skip,
          take: limit,
          include: adminUserInclude,
        }),
      ])

      return { data: await Promise.all(users.map(adminUserDbToDto)), total, skip }
    },

    update: async ({ pathParams: { id }, body: { role } }, { userId }) => {
      const user = await prisma.$transaction(
        async (tx) => {
          const user = await tx.user.findUniqueOrThrow({ where: { id } })
          if (user.role === role) return user

          if (user.role === 'admin') {
            const adminCount = await tx.user.count({ where: { role: 'admin' } })
            if (adminCount <= 1) {
              throw new ConflictError('The last admin cannot be removed')
            }
          }

          const updated = await tx.user.update({ where: { id }, data: { role } })
          await logAdminActivity(
            userId,
            {
              action: 'changeRole',
              targetType: 'user',
              targetId: id,
              targetLabel: user.username,
              details: { from: user.role, to: role },
            },
            tx,
          )
          return updated
        },
        // Serializable isolation prevents two admins from demoting each other concurrently
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )

      return adminUserDbToDto(
        await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: adminUserInclude }),
      )
    },
  },
}
