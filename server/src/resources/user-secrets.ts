import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { parseIncludes, parseListFilter } from './utils.js'
import { serialize } from '../transformers/index.js'
import { Prisma } from '@prisma/client'
import { ConflictError } from '../errors/index.js'
import { UserSecretService } from '../services/user-secret-service.js'

async function ownsSecret(userId: string, secretId: string) {
  const secret = await prisma.userSecret.findUniqueOrThrow({ where: { id: secretId } })
  return secret.ownerId === userId
}

function maskValue(secretValue: string) {
  const visibleSymbols = 3
  return '*'.repeat(secretValue.length - visibleSymbols) + secretValue.slice(-visibleSymbols)
}

export const userSecrets: RESTResourceImpl<Resources['userSecrets'], Prisma.UserSecretWhereInput> =
  {
    accessPolicy: {
      canCreate: ({ body: { ownerId } }, { userId }) => Promise.resolve(ownerId === userId),
      canRead: ({ pathParams: { id } }, { userId }) => ownsSecret(userId, id),
      canUpdate: ({ pathParams: { id } }, { userId }) => ownsSecret(userId, id),
      canDestroy: ({ pathParams: { id } }, { userId }) => ownsSecret(userId, id),
      canList: () => Promise.resolve(true),
      createListFilter: (userId) => ({ ownerId: userId! }),
    },

    handlers: {
      create: async ({ body, query }) => {
        // Currently we only support one secret of a given type per user. This makes the paths in the vault more
        // user-friendly (not that it matters too much, but it is mentioned as a "best practice" on the internet).
        // This is an artificial restriction and can be removed. If we wish to support multiple secrets of a given
        // type per user, we need to use the secret ID instead of the secret type as a vault key.
        const existingSecretOfType = await prisma.userSecret.findFirst({
          where: { ownerId: body.ownerId, type: body.type },
        })
        if (existingSecretOfType) {
          throw new ConflictError('Secret of this type already exists!')
        }

        const secret = await prisma.$transaction(async (tx) => {
          const secret = await tx.userSecret.create({
            data: {
              type: body.type,
              maskedValue: maskValue(body.value),
              owner: { connect: { id: body.ownerId } },
            },
            include: parseIncludes('UserSecret', query.include),
          })

          const secretService = new UserSecretService(body.ownerId)
          await secretService.store(body.type, body.value)

          return secret
        })

        return serialize('UserSecret', secret)
      },

      read: async ({ pathParams: { id }, query }) => {
        const dbSecret = await prisma.userSecret.findUniqueOrThrow({
          where: { id },
          include: parseIncludes('UserSecret', query.include),
        })

        return serialize('UserSecret', dbSecret)
      },

      update: async ({ pathParams: { id }, body, query }) => {
        const secret = await prisma.userSecret.findUniqueOrThrow({ where: { id } })

        const updatedSecret = await prisma.$transaction(async (tx) => {
          const secretService = new UserSecretService(secret.ownerId)

          const patch: Prisma.UserSecretUpdateInput = {}
          if (body.type) patch.type = body.type
          if (body.value) patch.maskedValue = maskValue(body.value)

          const updatedSecret = await tx.userSecret.update({
            data: patch,
            where: { id },
            include: parseIncludes('UserSecret', query.include),
          })

          await secretService.store(
            updatedSecret.type,
            body.value ?? (await secretService.retrieve(secret.type)),
          )

          // Remove warning suppression when we have more secret types.
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (updatedSecret.type !== secret.type) {
            await secretService.delete(secret.type)
          }

          return updatedSecret
        })

        return serialize('UserSecret', updatedSecret)
      },

      destroy: async ({ pathParams: { id } }) => {
        await prisma.$transaction(async (tx) => {
          const secret = await tx.userSecret.delete({ where: { id } })
          await new UserSecretService(secret.ownerId).delete(secret.type)
        })
      },

      list: async ({ query }, { listFilter }) => {
        const filter = parseListFilter<Prisma.UserSecretWhereInput>(query)
        const where = { AND: [filter.where, listFilter] }
        const total = await prisma.userSecret.count({ where })
        const secrets = await prisma.userSecret.findMany({
          where,
          include: parseIncludes('UserSecret', query.include),
          orderBy: filter.orderBy,
          skip: filter.skip,
          take: filter.limit,
        })
        return {
          data: await serialize('UserSecret', secrets),
          total,
          skip: filter.skip,
        }
      },
    },
  }
