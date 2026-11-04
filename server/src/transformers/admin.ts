import { Prisma } from '@prisma/client'
import {
  AdminActivityDto,
  AdminFeatureRequestDto,
  AdminTapestryDto,
  AdminUserDto,
  SharingLevel,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin.js'
import { FeatureRequestDto } from 'tapestry-shared/src/data-transfer/resources/dtos/feature-request.js'
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
  featureRequests: { where: { status: 'pending' }, select: { id: true }, take: 1 },
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
    parentId: tapestry.parentId,
    ownerId: tapestry.ownerId,
    owner: await adminUserDbToDto(tapestry.owner),
    pendingFeatureRequestId: tapestry.featureRequests[0]?.id ?? null,
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

export function featureRequestDbToDto(
  request: Prisma.FeatureRequestGetPayload<null>,
): FeatureRequestDto {
  return {
    id: request.id,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    tapestryId: request.tapestryId,
    tapestryTitle: request.tapestryTitle,
    requesterId: request.requesterId,
    status: request.status,
    decidedAt: request.decidedAt,
  }
}

export const adminFeatureRequestInclude = {
  tapestry: { include: adminTapestryInclude },
  requester: { include: adminUserInclude },
  decidedBy: { select: { username: true } },
} satisfies Prisma.FeatureRequestInclude

export async function adminFeatureRequestDbToDto(
  request: Prisma.FeatureRequestGetPayload<{ include: typeof adminFeatureRequestInclude }>,
): Promise<AdminFeatureRequestDto> {
  return {
    ...featureRequestDbToDto(request),
    tapestry: request.tapestry && (await adminTapestryDbToDto(request.tapestry)),
    requester: request.requester && (await adminUserDbToDto(request.requester)),
    decidedByUsername: request.decidedBy?.username ?? null,
  }
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
