import { Prisma } from '@prisma/client'
import { prisma } from '../db.js'
import { BadRequestError } from '../errors/index.js'

type Tx = Prisma.TransactionClient

/**
 * Features a tapestry: it is placed at the beginning of the Gallery. Only link-shared tapestries can
 * be featured, and only owners change sharing. Admin changes keep the "last updated" date that
 * users see, so `updatedAt` is preserved.
 */
export async function featureTapestry(tx: Tx, tapestryId: string) {
  const tapestry = await tx.tapestry.findUniqueOrThrow({ where: { id: tapestryId } })
  if (tapestry.featured) {
    return tapestry
  }

  if (tapestry.visibility !== 'link') {
    throw new BadRequestError('Only tapestries shared with anyone with the link can be featured')
  }

  const { _min } = await tx.tapestry.aggregate({
    where: { featured: true },
    _min: { galleryPosition: true },
  })

  return tx.tapestry.update({
    where: { id: tapestryId },
    data: {
      featured: true,
      featuredAt: new Date(),
      galleryPosition: (_min.galleryPosition ?? 1) - 1,
      updatedAt: tapestry.updatedAt,
    },
  })
}

/** Removes a tapestry from the Gallery. */
export async function unfeatureTapestry(tx: Tx, tapestryId: string, preserveUpdatedAt = true) {
  const tapestry = await tx.tapestry.findUniqueOrThrow({ where: { id: tapestryId } })
  if (!tapestry.featured) return tapestry

  return tx.tapestry.update({
    where: { id: tapestryId },
    data: {
      featured: false,
      featuredAt: null,
      galleryPosition: null,
      ...(preserveUpdatedAt ? { updatedAt: tapestry.updatedAt } : {}),
    },
  })
}

/**
 * Permanently deletes a tapestry and records the deletion for reporting, since deleted tapestries
 * leave no other trace in the database.
 */
export async function deleteTapestryPermanently(
  tapestryId: string,
  deletedById: string,
  byAdmin: boolean,
  afterDelete?: (
    tx: Tx,
    tapestry: { id: string; title: string; itemCount: number },
  ) => Promise<unknown>,
) {
  return prisma.$transaction(async (tx) => {
    const tapestry = await tx.tapestry.findUniqueOrThrow({
      where: { id: tapestryId },
      include: { owner: { select: { username: true } }, _count: { select: { items: true } } },
    })

    await tx.presentationStep.deleteMany({
      where: {
        OR: [{ item: { tapestryId } }, { group: { tapestryId } }],
      },
    })
    await tx.imageAsset.deleteMany({
      where: { thumbnailForItems: { some: { tapestryId } } },
    })
    await tx.tapestry.delete({ where: { id: tapestryId } })

    await tx.tapestryDeletion.create({
      data: {
        tapestryId,
        title: tapestry.title,
        ownerId: tapestry.ownerId,
        ownerUsername: tapestry.owner.username,
        deletedById,
        byAdmin,
      },
    })

    await afterDelete?.(tx, { ...tapestry, itemCount: tapestry._count.items })

    return tapestry
  })
}
