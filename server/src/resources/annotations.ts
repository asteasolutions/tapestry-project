import { Resources } from 'tapestry-shared/src/data-transfer/resources'
import { RESTResourceImpl } from './base-resource'
import { Prisma } from '../../prisma/generated/prisma/client'
import { canEditItem, canViewItem } from './items'
import { prisma } from '../db'
import { serialize } from '../transformers'

async function canDestroy(id: string, userId: string) {
  const annotation = await prisma.itemAnnotation.findFirstOrThrow({ where: { id, userId } })

  return (
    annotation.userId === userId || (!!annotation.itemId && canEditItem(userId, annotation.itemId))
  )
}

export const annotations: RESTResourceImpl<
  Resources['annotations'],
  Prisma.ItemAnnotationWhereInput
> = {
  accessPolicy: {
    canCreate: ({ body }, { userId }) => canViewItem(userId, body.itemId),
    canDestroy: async ({ pathParams }, { userId }) => canDestroy(pathParams.id, userId),
    canRead: ({ pathParams }, { userId }) => canViewItem(userId, pathParams.id),
    createListFilter: () => ({}),
  },
  handlers: {
    create: async ({ body }, { userId }) =>
      serialize(
        'ItemAnnotation',
        await prisma.itemAnnotation.create({ data: { ...body, userId } }),
      ),

    destroy: async ({ pathParams: { id } }) => {
      await prisma.itemAnnotation.delete({ where: { id } })
    },
    read: async ({ pathParams: { id } }) =>
      serialize('ItemAnnotation', await prisma.itemAnnotation.findFirstOrThrow({ where: { id } })),
  },
}
