import { prisma } from '../db.js'

/**
 * Checks the role in the database on every call, so that role changes take effect immediately
 * (access tokens do not carry the role).
 */
export async function isAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  return user?.role === 'admin'
}

/** Access-policy helper for admin-only endpoints. */
export const adminOnly = (_: unknown, { userId }: { userId: string | null }) => isAdmin(userId)
