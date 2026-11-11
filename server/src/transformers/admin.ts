import { Prisma } from '@prisma/client'
import {
  AdminActivityDto,
  AdminTapestryDto,
  AdminUserDto,
  SharingLevel,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin.js'
import { s3Service } from '../services/s3-service.js'
import { userDbToDto } from './user.js'

export const adminUserInclude = {
  _count: { select: { tapestries: true } },
} satisfies Prisma.UserInclude

export type AdminDbUser = Prisma.UserGetPayload<{ include: typeof adminUserInclude }>

export async function adminUserDbToDto(user: AdminDbUser): Promise<AdminUserDto> {
  return {
    ...(await userDbToDto(user)),
    gsiUserId: user.gsiUserId,
    orcidId: user.orcidId,
    wikimediaId: user.wikimediaId,
    blueskyDid: user.blueskyDid,
    tapestryCount: user._count.tapestries,
  }
}

export const adminTapestryInclude = {
  owner: { include: adminUserInclude },
  _count: { select: { items: true, userAccess: true } },
} satisfies Prisma.TapestryInclude

export const adminTapestryDetailInclude = {
  ...adminTapestryInclude,
  userAccess: { include: { user: { include: adminUserInclude } }, orderBy: { createdAt: 'asc' } },
  parent: { select: { id: true, title: true, slug: true, owner: { select: { username: true } } } },
} satisfies Prisma.TapestryInclude

type AdminDbTapestry = Prisma.TapestryGetPayload<{ include: typeof adminTapestryInclude }>
type AdminDbTapestryDetail = Prisma.TapestryGetPayload<{
  include: typeof adminTapestryDetailInclude
}>

export function sharingLevelOf(visibility: string, accessCount: number): SharingLevel {
  if (visibility === 'link') return 'link'
  return accessCount > 0 ? 'invited' : 'owner'
}

export async function adminTapestryDbToDto(
  tapestry: AdminDbTapestry | AdminDbTapestryDetail,
): Promise<AdminTapestryDto> {
  const dto: AdminTapestryDto = {
    id: tapestry.id,
    createdAt: tapestry.createdAt,
    updatedAt: tapestry.updatedAt,
    title: tapestry.title,
    slug: tapestry.slug,
    description: tapestry.description,
    thumbnail: tapestry.thumbnail && (await s3Service.getReadObjectUrl(tapestry.thumbnail)),
    visibility: tapestry.visibility,
    sharingLevel: sharingLevelOf(tapestry.visibility, tapestry._count.userAccess),
    featured: tapestry.featured,
    featuredAt: tapestry.featuredAt,
    galleryPosition: tapestry.galleryPosition,
    itemCount: tapestry._count.items,
    invitedCount: tapestry._count.userAccess,
    parentId: tapestry.parentId,
    ownerId: tapestry.ownerId,
    owner: await adminUserDbToDto(tapestry.owner),
  }

  if ('userAccess' in tapestry) {
    dto.userAccess = await Promise.all(
      tapestry.userAccess.map(async (access) => ({
        id: access.id,
        userId: access.userId,
        canEdit: access.canEdit,
        user: await adminUserDbToDto(access.user),
      })),
    )
    dto.parent = tapestry.parent && {
      id: tapestry.parent.id,
      title: tapestry.parent.title,
      slug: tapestry.parent.slug,
      ownerUsername: tapestry.parent.owner.username,
    }
  }

  return dto
}

export function adminActivityDbToDto(
  activity: Prisma.AdminActivityGetPayload<null>,
): AdminActivityDto {
  return {
    id: activity.id,
    createdAt: activity.createdAt,
    adminId: activity.adminId,
    adminUsername: activity.adminUsername,
    action: activity.action,
    targetType: activity.targetType,
    targetId: activity.targetId,
    targetLabel: activity.targetLabel,
    details:
      activity.details && typeof activity.details === 'object' && !Array.isArray(activity.details)
        ? (activity.details as Record<string, unknown>)
        : null,
  }
}
