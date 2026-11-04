import { BaseResourceDto } from './common.js'
import { FeatureRequestDto } from './feature-request.js'
import { TapestryVisibility } from './tapestry.js'
import { UserDto, UserRole } from './user.js'

// ---- Users ----

export interface AdminUserDto extends UserDto {
  gsiUserId: string | null
  orcidId: string | null
  wikimediaId: string | null
  blueskyDid: string | null
  tapestryCount: number
}

export interface AdminUserUpdateDto {
  role: UserRole
}

// ---- Tapestries ----

/**
 * "owner" - private with no invited users; "invited" - private with at least one invited user;
 * "link" - anyone with the link can view.
 */
export const SHARING_LEVELS = ['owner', 'invited', 'link'] as const

export type SharingLevel = (typeof SHARING_LEVELS)[number]

export interface AdminTapestryAccessDto {
  id: string
  userId: string
  canEdit: boolean
  user: AdminUserDto
}

export interface AdminTapestryParentDto {
  id: string
  title: string
  slug: string
  ownerUsername: string
}

export interface AdminTapestryDto extends BaseResourceDto {
  title: string
  slug: string
  description: string | null
  thumbnail: string | null
  visibility: TapestryVisibility
  sharingLevel: SharingLevel
  featured: boolean
  featuredAt: Date | null
  galleryPosition: number | null
  itemCount: number
  parentId: string | null
  ownerId: string
  owner: AdminUserDto
  pendingFeatureRequestId: string | null
  // Returned only by the "read" endpoint
  userAccess?: AdminTapestryAccessDto[] | null
  parent?: AdminTapestryParentDto | null
}

export interface AdminTapestryUpdateDto {
  sharingLevel?: SharingLevel
  featured?: boolean
}

// ---- Feature requests ----

export interface AdminFeatureRequestDto extends FeatureRequestDto {
  tapestry: AdminTapestryDto | null
  requester: AdminUserDto | null
  decidedByUsername: string | null
}

export interface AdminFeatureRequestUpdateDto {
  status: 'approved' | 'declined'
}

// ---- Activity log ----

export const ADMIN_ACTIONS = [
  'openTapestry',
  'changeSharing',
  'changeFeatured',
  'approveFeatureRequest',
  'declineFeatureRequest',
  'reorderGallery',
  'deleteTapestry',
  'deleteItems',
  'changeRole',
] as const

export type AdminAction = (typeof ADMIN_ACTIONS)[number]

export const ADMIN_ACTIVITY_TARGET_TYPES = [
  'tapestry',
  'user',
  'featureRequest',
  'gallery',
] as const

export type AdminActivityTargetType = (typeof ADMIN_ACTIVITY_TARGET_TYPES)[number]

export interface AdminActivityDto {
  id: string
  createdAt: Date
  adminId: string | null
  adminUsername: string
  action: AdminAction
  targetType: AdminActivityTargetType
  targetId: string | null
  targetLabel: string | null
  details: Record<string, unknown> | null
}

/** Permanently deletes items of a tapestry, removing their presentation steps first. */
export interface DeleteItemsCommandDto {
  action: Extract<AdminAction, 'deleteItems'>
  tapestryId: string
  itemIds: string[]
}

/** Saves the complete Gallery order. The list must contain exactly the featured tapestries. */
export interface ReorderGalleryCommandDto {
  action: Extract<AdminAction, 'reorderGallery'>
  tapestryIds: string[]
}

/**
 * Creating an activity entry performs the admin action it describes. Other actions are logged by
 * the server as side effects of their own endpoints and cannot be created directly.
 */
export type AdminActivityCreateDto = DeleteItemsCommandDto | ReorderGalleryCommandDto

// ---- Reports ----

export const REPORT_METRICS = [
  'M-01',
  'M-02',
  'M-03',
  'M-04',
  'M-05',
  'M-06',
  'M-07',
  'M-08',
  'M-09',
  'M-10',
  'M-11',
  'M-12',
] as const

export type ReportMetric = (typeof REPORT_METRICS)[number]

export const REPORT_COMPARISONS = ['none', 'previous', 'lastYear'] as const

export type ReportComparison = (typeof REPORT_COMPARISONS)[number]

export interface ReportQueryCreateDto {
  metric: ReportMetric
  /** Start of the range (inclusive). Null means "all time". */
  from: Date | null
  /** End of the range (exclusive). */
  to: Date
  compare: ReportComparison
}

/** Describes the admin list (users or tapestries) holding the records behind a figure. */
export interface DrillTargetDto {
  kind: 'users' | 'tapestries'
  filter: Record<string, string>
}

export type ReportUnit = 'count' | 'percent' | 'days'

export interface ReportFigureDto {
  key: string
  label: string
  value: number | null
  unit: ReportUnit
  drill: DrillTargetDto | null
}

export interface ReportTableColumnDto {
  key: string
  label: string
  unit: ReportUnit
}

export interface ReportTableRowDto {
  key: string
  label: string
  values: (number | null)[]
  /** One drill target per value (or null where drill-through is not available). */
  drill: (DrillTargetDto | null)[] | null
}

export interface ReportTableDto {
  key: string
  title: string
  columns: ReportTableColumnDto[]
  rows: ReportTableRowDto[]
}

export interface ReportDataDto {
  from: Date | null
  to: Date
  figures: ReportFigureDto[]
  tables: ReportTableDto[]
}

export interface ReportDto {
  metric: ReportMetric
  title: string
  dataStatus: 'available' | 'partial'
  limitations: string | null
  /** Current-state metrics ignore the time range and cannot be compared. */
  isCurrentState: boolean
  current: ReportDataDto
  comparison: ReportDataDto | null
}
