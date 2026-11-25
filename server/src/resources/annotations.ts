import { Resources } from 'tapestry-shared/src/data-transfer/resources'
import { RESTResourceImpl } from './base-resource'
import { Prisma } from '../../prisma/generated/prisma/client'
import { canViewItem } from './items'
import { prisma } from '../db'
import { serialize } from '../transformers'
import { BadRequestError } from '../errors'
import { getExtensions } from 'tapestry-core/src/tiptap'
import { TEXT_ITEM_EXTENSIONS_MASK } from 'tapestry-shared/src/utils'
import { TiptapEditorService } from '../services/tiptap-editor-service'
import { AnnotationExtension } from 'tapestry-core/src/tiptap/annotation-extension'
import { parseIncludes, parseListFilter } from './utils'
import { ListParamsOutputDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common'
import { ownsTapestry } from './tapestries'
import { partition } from 'lodash-es'
import { AnnotationDto } from 'tapestry-shared/src/data-transfer/resources/dtos/annotation'
import { arrayToIdMap } from 'tapestry-core/src/utils'
import { CommentGetPayload } from '../../prisma/generated/prisma/models'
import { ItemAnnotationCommentDto } from 'tapestry-shared/src/data-transfer/resources/dtos/comment'

const ANNOTATIONS_CUSTOM_INCLUDES = ['commentThread']

async function includeCommentThreads(annotations: AnnotationDto[]) {
  const annotationIds = annotations.map((a) => a.id)

  const commentsCount = await prisma.comment.groupBy({
    by: 'itemAnnotationId',
    _count: { _all: true },
    where: {
      itemAnnotationId: {
        in: annotations.map((a) => a.id),
      },
    },
  })

  const oldestComments = await prisma.$queryRaw<CommentGetPayload<null>[]>`
            SELECT *
            FROM unnest(${annotationIds}::text[]) AS a(id)
            CROSS JOIN LATERAL (
              SELECT * FROM (
                SELECT DISTINCT ON ("authorId") *
                FROM "Comment"
                WHERE "itemAnnotationId" = a.id
                ORDER BY "authorId", "createdAt" ASC
              ) firsts
              ORDER BY "createdAt" ASC
              LIMIT 3
            ) c
          `

  const users = await prisma.user.findMany({
    where: { id: { in: oldestComments.map((c) => c.authorId) } },
  })

  const userMap = arrayToIdMap(users)
  const commentsCountMap = arrayToIdMap(
    commentsCount.map((c) => ({ id: c.itemAnnotationId ?? '', count: c._count._all })),
  )
  const commentThreadsMap: Record<string, AnnotationDto['commentThread']> = {}

  for (const oldestComment of oldestComments) {
    const annotationId = oldestComment.itemAnnotationId
    const author = userMap[oldestComment.authorId]
    const annotationCommentsCount = commentsCountMap[annotationId ?? '']?.count
    if (!annotationId || !author || !annotationCommentsCount) {
      continue
    }
    const authorDto = await serialize('User', author, 'publicProfile')
    if (commentThreadsMap[annotationId]) {
      commentThreadsMap[annotationId].authors.push(authorDto)
    } else {
      const firstComment = (await serialize('Comment', oldestComment)) as ItemAnnotationCommentDto
      firstComment.author = authorDto
      commentThreadsMap[annotationId] = {
        size: annotationCommentsCount,
        firstComment,
        authors: [authorDto],
      }
    }
  }

  for (const annotation of annotations) {
    annotation.commentThread = commentThreadsMap[annotation.id]
  }
}

async function canDestroy(id: string, userId: string) {
  const annotation = await prisma.itemAnnotation.findFirstOrThrow({
    where: { id },
    include: { item: { select: { tapestryId: true } } },
  })

  return annotation.authorId === userId || ownsTapestry(userId, annotation.item.tapestryId)
}

async function canListAnnotations(filter: ListParamsOutputDto['filter'], userId: string | null) {
  const itemId = filter?.find(({ prop, op }) => prop === 'itemId' && op === 'eq')?.value as
    | string
    | undefined

  if (!itemId) return false

  return canViewItem(userId, itemId)
}

export const annotations: RESTResourceImpl<Resources['annotations'], never> = {
  accessPolicy: {
    canCreate: ({ body }, { userId }) => canViewItem(userId, body.itemId),
    canDestroy: async ({ pathParams }, { userId }) => canDestroy(pathParams.id, userId),
    canRead: ({ pathParams }, { userId }) => canViewItem(userId, pathParams.id),
    canList: ({ query: { filter } }, { userId }) => canListAnnotations(filter, userId),
  },
  handlers: {
    create: async ({ body }, { userId }) => {
      const item = await prisma.item.findUniqueOrThrow({
        where: { id: body.itemId },
        select: { type: true, text: true, id: true },
      })
      if (item.type === 'text') {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (body.annotationType !== 'text') {
          throw new BadRequestError('Invalid annotation type')
        }
        const newAnnotationId = crypto.randomUUID()

        const tiptapEditorService = new TiptapEditorService(
          getExtensions({ controls: TEXT_ITEM_EXTENSIONS_MASK, onCreateLink: () => false }),
          item.text!,
        )
        tiptapEditorService.setMark(AnnotationExtension.name, body.from, body.to, {
          id: newAnnotationId,
        })
        const newHTML = tiptapEditorService.toHTML()

        return prisma.$transaction(async (tx) => {
          await tx.item.update({ where: { id: item.id }, data: { text: newHTML } })
          const newAnnotation = await tx.itemAnnotation.create({
            data: { itemId: body.itemId, authorId: userId, id: newAnnotationId },
          })
          return serialize('ItemAnnotation', newAnnotation)
        })
      } else {
        throw new BadRequestError('Annotations not implemented for this item type')
      }
    },

    destroy: async ({ pathParams: { id } }) => {
      const annotation = await prisma.itemAnnotation.findFirstOrThrow({
        where: { id },
        include: { item: true },
      })
      const item = annotation.item
      if (item.type === 'text') {
        const tiptapEditorService = new TiptapEditorService(
          getExtensions({ controls: TEXT_ITEM_EXTENSIONS_MASK, onCreateLink: () => false }),
          item.text!,
        )
        tiptapEditorService.unsetMark(AnnotationExtension.name, {
          id,
        })
        const newHTML = tiptapEditorService.toHTML()

        await prisma.$transaction(async (tx) => {
          await tx.item.update({ where: { id: item.id }, data: { text: newHTML } })
          await prisma.itemAnnotation.delete({ where: { id } })
        })
      } else {
        throw new BadRequestError('Annotations not implemented for this item type')
      }
    },

    read: async ({ pathParams: { id } }) =>
      serialize('ItemAnnotation', await prisma.itemAnnotation.findFirstOrThrow({ where: { id } })),

    list: async ({ query }) => {
      const filter = parseListFilter<Prisma.ItemAnnotationWhereInput>(query)
      const where = filter.where
      const total = await prisma.itemAnnotation.count({ where })

      const [customIncludes, includes] = partition(query.include, (include) =>
        ANNOTATIONS_CUSTOM_INCLUDES.includes(include),
      )

      const annotations = await prisma.itemAnnotation.findMany({
        where,
        include: parseIncludes('ItemAnnotation', includes),
        orderBy: filter.orderBy,
        skip: filter.skip,
        take: filter.limit,
      })

      const serialized = await serialize('ItemAnnotation', annotations)

      if (customIncludes.includes('commentThread')) {
        await includeCommentThreads(serialized)
      }

      return {
        data: serialized,
        total,
        skip: filter.skip,
      }
    },
  },
}
