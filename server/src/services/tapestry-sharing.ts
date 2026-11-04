import { Prisma } from '@prisma/client'
import { prisma } from '../db.js'

type Tx = Prisma.TransactionClient

/** Closes the pending feature request of a tapestry, if any (e.g. when sharing gets restricted). */
export async function closePendingFeatureRequests(tx: Tx, tapestryId: string) {
  await tx.featureRequest.updateMany({
    where: { tapestryId, status: 'pending' },
    data: { status: 'closed', decidedAt: new Date() },
  })
}

/**
 * Features a tapestry: it is placed at the beginning of the Gallery and becomes link-shared.
 * Admin changes keep the "last updated" date that users see, so `updatedAt` is preserved.
 */
export async function featureTapestry(tx: Tx, tapestryId: string) {
  const tapestry = await tx.tapestry.findUniqueOrThrow({ where: { id: tapestryId } })
  if (tapestry.featured) return tapestry

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
      visibility: 'link',
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
 * Applied whenever a tapestry stops being link-shared: it leaves the Gallery immediately and its
 * pending feature request is closed.
 */
export async function onSharingRestricted(tx: Tx, tapestryId: string, preserveUpdatedAt = true) {
  await unfeatureTapestry(tx, tapestryId, preserveUpdatedAt)
  await closePendingFeatureRequests(tx, tapestryId)
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

    await closePendingFeatureRequests(tx, tapestryId)
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
