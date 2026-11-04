import { Prisma } from '@prisma/client'
import { prisma } from '../db.js'

/**
 * Appends an entry to the admin activity log and returns it. Entries are never updated or deleted.
 */
export async function logAdminActivity(
  adminId: string,
  entry: Pick<Prisma.AdminActivityCreateInput, 'action' | 'targetType' | 'targetId' | 'targetLabel' | 'details'>,
  tx: Prisma.TransactionClient = prisma,
) {
  const admin = await tx.user.findUniqueOrThrow({
    where: { id: adminId },
    select: { username: true },
  })

  return tx.adminActivity.create({
    data: {
      adminId,
      adminUsername: admin.username,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      targetLabel: entry.targetLabel ?? null,
      details: entry.details,
    },
  })
}

const OPEN_TAPESTRY_DEDUPE_MS = 30 * 60 * 1000

/**
 * Records that an admin opened a private tapestry which they could not access as a regular user.
 * Tapestry pages fetch the tapestry several times while loading, so repeated opens within a short
 * window are recorded only once.
 */
export async function logAdminOpenedTapestry(
  adminId: string,
  tapestry: { id: string; title: string },
) {
  const recent = await prisma.adminActivity.findFirst({
    where: {
      adminId,
      action: 'openTapestry',
      targetId: tapestry.id,
      createdAt: { gte: new Date(Date.now() - OPEN_TAPESTRY_DEDUPE_MS) },
    },
    select: { id: true },
  })
  if (recent) return

  await logAdminActivity(adminId, {
    action: 'openTapestry',
    targetType: 'tapestry',
    targetId: tapestry.id,
    targetLabel: tapestry.title,
  })
}
