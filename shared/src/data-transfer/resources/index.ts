import { createRESTEndpoints } from './base.js'
import { TapestryCreateSchema, TapestrySchema, TapestryUpdateSchema } from './schemas/tapestry.js'
import { IO } from './types.js'
import { ItemCreateSchema, ItemSchema, ItemUpdateSchema } from './schemas/item.js'
import { RelCreateSchema, RelSchema, RelUpdateSchema } from './schemas/rel.js'
import { SessionCreateSchema, SessionSchema } from './schemas/session.js'
import { PublicUserProfileSchema, UserSchema } from './schemas/user.js'
import { AssetURLCreateSchema, AssetURLSchema } from './schemas/asset-url.js'
import {
  TapestryInvitationCreateParams,
  TapestryInvitationSchema,
} from './schemas/tapestry-invitation.js'
import { CommentCreateSchema, CommentSchema, CommentUpdateSchema } from './schemas/comment.js'
import { ProxyCreateSchema, ProxySchema } from './schemas/proxy.js'
import {
  TapestryCreateJobCreateSchema,
  TapestryCreateJobSchema,
} from './schemas/tapestry-create-job.js'
import { CommentThreadsSchema } from './schemas/comment-threads.js'
import { TapestryCreateDto, TapestryDto, TapestryUpdateDto } from './dtos/tapestry.js'
import { ItemCreateDto, ItemDto, ItemUpdateDto } from './dtos/item.js'
import { RelCreateDto, RelDto, RelUpdateDto } from './dtos/rel.js'
import { CommentCreateDto, CommentDto, CommentUpdateDto } from './dtos/comment.js'
import { CommentThreadsDto } from './dtos/comment-threads.js'
import { PublicUserProfileDto, UserDto } from './dtos/user.js'
import { SessionCreateDto, SessionDto } from './dtos/session.js'
import { AssetURLCreateDto, AssetURLDto } from './dtos/asset-url.js'
import {
  TapestryInvitationCreateDto,
  TapestryInvitationDto,
  TapestryInvitationUpdateDto,
} from './dtos/tapestry-invitation.js'
import { ProxyCreateDto, ProxyDto } from './dtos/proxy.js'
import { TapestryCreateJobCreateDto, TapestryCreateJobDto } from './dtos/tapestry-create-job.js'
import {
  TapestryAccessCreateDto,
  TapestryAccessDto,
  TapestryAccessUpdateDto,
} from './dtos/tapestry-access.js'
import {
  TapestryAccessCreateSchema,
  TapestryAccessSchema,
  TapestryAccessUpdateSchema,
} from './schemas/tapestry-access.js'
import { BatchMutationDto, BatchMutationCreateDto } from './dtos/common.js'
import { batchMutation, batchMutationCreateParams } from './schemas/common.js'
import {
  TapestryInteractionCreateDto,
  TapestryInteractionDto,
} from './dtos/tapestry-interaction.js'
import {
  TapestryInteractionCreateParams,
  TapestryInteractionSchema,
} from './schemas/tapestry-interaction.js'
import {
  AIChatCreateDto,
  AIChatDto,
  AIChatMessageCreateDto,
  AIChatMessageDto,
} from './dtos/ai-chat.js'
import {
  AIChatCreateSchema,
  AIChatMessageCreateSchema,
  AIChatMessageSchema,
  AIChatSchema,
} from './schemas/ai-chat.js'
import { GroupCreateDto, GroupDto, GroupUpdateDto } from './dtos/group.js'
import { GroupCreateSchema, GroupSchema, GroupUpdateSchema } from './schemas/group.js'
import {
  PresentationStepCreateDto,
  PresentationStepDto,
  PresentationStepUpdateDto,
} from './dtos/presentation-step.js'
import {
  PresentationStepCreateSchema,
  PresentationStepSchema,
  PresentationStepUpdateSchema,
} from './schemas/presentation-step.js'
import { UserSecretDto, UserSecretCreateDto, UserSecretUpdateDto } from './dtos/user-secret.js'
import {
  UserSecretSchema,
  UserSecretCreateSchema,
  UserSecretUpdateSchema,
} from './schemas/user-secret.js'
import { TapestryBookmarkCreateDto, TapestryBookmarkDto } from './dtos/tapestry-bookmark.js'
import {
  TapestryBookmarkCreateSchema,
  TapestryBookmarkSchema,
} from './schemas/tapestry-bookmark.js'

import { FeatureRequestCreateDto, FeatureRequestDto } from './dtos/feature-request.js'
import { FeatureRequestCreateSchema, FeatureRequestSchema } from './schemas/feature-request.js'
import { TapestryExportCreateDto, TapestryExportDto } from './dtos/tapestry-export.js'
import { TapestryExportCreateSchema, TapestryExportSchema } from './schemas/tapestry-export.js'
import {
  AdminActivityCreateDto,
  AdminActivityDto,
  AdminFeatureRequestDto,
  AdminFeatureRequestUpdateDto,
  AdminTapestryDto,
  AdminTapestryUpdateDto,
  AdminUserDto,
  AdminUserUpdateDto,
  ReportDto,
  ReportQueryCreateDto,
} from './dtos/admin.js'
import {
  AdminActivityCreateSchema,
  AdminActivitySchema,
  AdminFeatureRequestSchema,
  AdminFeatureRequestUpdateSchema,
  AdminTapestrySchema,
  AdminTapestryUpdateSchema,
  AdminUserSchema,
  AdminUserUpdateSchema,
  ReportQueryCreateSchema,
  ReportSchema,
} from './schemas/admin.js'

const tapestryIncludes = [
  'owner',
  'items.thumbnail.renditions',
  'rels',
  'groups',
  'userAccess',
  'userInvitations',
] as const

export const resources = {
  tapestries: createRESTEndpoints<IO<TapestryDto>, IO<TapestryCreateDto>, IO<TapestryUpdateDto>>()({
    name: 'tapestries',
    schema: TapestrySchema,
    endpoints: 'crudl',
    requireAuth: 'cud',
    allowedIncludes: tapestryIncludes,
    createParamsSchema: TapestryCreateSchema,
    updateParamsSchema: TapestryUpdateSchema,
  }),
  items: createRESTEndpoints<IO<ItemDto>, IO<ItemCreateDto>, IO<ItemUpdateDto>>()({
    name: 'items',
    schema: ItemSchema,
    endpoints: 'crudl',
    requireAuth: 'cud',
    createParamsSchema: ItemCreateSchema,
    updateParamsSchema: ItemUpdateSchema,
  }),
  itemBatchMutations: createRESTEndpoints<
    IO<BatchMutationDto<ItemDto>>,
    IO<BatchMutationCreateDto<ItemCreateDto, ItemUpdateDto>>
  >()({
    name: 'item-batch-mutations',
    schema: batchMutation(ItemSchema),
    endpoints: 'c',
    requireAuth: 'c',
    createParamsSchema: batchMutationCreateParams(ItemCreateSchema, ItemUpdateSchema),
  }),
  rels: createRESTEndpoints<IO<RelDto>, IO<RelCreateDto>, IO<RelUpdateDto>>()({
    name: 'rels',
    schema: RelSchema,
    endpoints: 'crudl',
    requireAuth: 'cud',
    createParamsSchema: RelCreateSchema,
    updateParamsSchema: RelUpdateSchema,
  }),
  relBatchMutations: createRESTEndpoints<
    IO<BatchMutationDto<RelDto>>,
    IO<BatchMutationCreateDto<RelCreateDto, RelUpdateDto>>
  >()({
    name: 'rel-batch-mutations',
    schema: batchMutation(RelSchema),
    endpoints: 'c',
    requireAuth: 'c',
    createParamsSchema: batchMutationCreateParams(RelCreateSchema, RelUpdateSchema),
  }),
  comments: createRESTEndpoints<IO<CommentDto>, IO<CommentCreateDto>, IO<CommentUpdateDto>>()({
    name: 'comments',
    schema: CommentSchema,
    endpoints: 'crudl',
    requireAuth: 'cud',
    allowedIncludes: ['author'],
    createParamsSchema: CommentCreateSchema,
    updateParamsSchema: CommentUpdateSchema,
  }),
  commentThreads: createRESTEndpoints<IO<CommentThreadsDto>>()({
    name: 'comment-threads',
    schema: CommentThreadsSchema,
    endpoints: 'r',
    requireAuth: '',
  }),
  presentationSteps: createRESTEndpoints<
    IO<PresentationStepDto>,
    IO<PresentationStepCreateDto>,
    IO<PresentationStepUpdateDto>
  >()({
    name: 'presentation-steps',
    schema: PresentationStepSchema,
    endpoints: 'crudl',
    requireAuth: 'cud',
    createParamsSchema: PresentationStepCreateSchema,
    updateParamsSchema: PresentationStepUpdateSchema,
  }),
  presentationStepBatchMutations: createRESTEndpoints<
    IO<BatchMutationDto<PresentationStepDto>>,
    IO<BatchMutationCreateDto<PresentationStepCreateDto, PresentationStepUpdateDto>>
  >()({
    name: 'presentation-step-batch-mutations',
    schema: batchMutation(PresentationStepSchema),
    endpoints: 'c',
    requireAuth: 'c',
    createParamsSchema: batchMutationCreateParams(
      PresentationStepCreateSchema,
      PresentationStepUpdateSchema,
    ),
  }),
  users: createRESTEndpoints<IO<UserDto>>()({
    name: 'users',
    schema: UserSchema,
    endpoints: 'r',
    requireAuth: 'r',
  }),
  publicUserProfiles: createRESTEndpoints<IO<PublicUserProfileDto>>()({
    name: 'public-user-profiles',
    schema: PublicUserProfileSchema,
    endpoints: 'r',
    requireAuth: '',
  }),
  sessions: createRESTEndpoints<IO<SessionDto>, IO<SessionCreateDto>>()({
    name: 'sessions',
    schema: SessionSchema,
    endpoints: 'cd',
    requireAuth: 'd',
    allowedIncludes: ['user'],
    createParamsSchema: SessionCreateSchema,
  }),
  assetURLs: createRESTEndpoints<IO<AssetURLDto>, IO<AssetURLCreateDto>>()({
    name: 'asset-urls',
    schema: AssetURLSchema,
    endpoints: 'c',
    requireAuth: 'c',
    createParamsSchema: AssetURLCreateSchema,
  }),
  tapestryInvitations: createRESTEndpoints<
    IO<TapestryInvitationDto>,
    IO<TapestryInvitationCreateDto>,
    IO<TapestryInvitationUpdateDto>
  >()({
    name: 'tapestry-invitations',
    schema: TapestryInvitationSchema,
    endpoints: 'crdl',
    requireAuth: 'crdl',
    createParamsSchema: TapestryInvitationCreateParams,
    allowedIncludes: ['tapestry.owner', 'tapestry.userAccess'],
  }),
  tapestryAccess: createRESTEndpoints<
    IO<TapestryAccessDto>,
    IO<TapestryAccessCreateDto>,
    IO<TapestryAccessUpdateDto>
  >()({
    name: 'tapestry-access',
    schema: TapestryAccessSchema,
    endpoints: 'cudl',
    requireAuth: 'cudl',
    allowedIncludes: ['user'],
    createParamsSchema: TapestryAccessCreateSchema,
    updateParamsSchema: TapestryAccessUpdateSchema,
  }),
  tapestryInteractions: createRESTEndpoints<
    IO<TapestryInteractionDto>,
    IO<TapestryInteractionCreateDto>
  >()({
    name: 'tapestry-interactions',
    schema: TapestryInteractionSchema,
    endpoints: 'c',
    requireAuth: 'c',
    createParamsSchema: TapestryInteractionCreateParams,
  }),
  tapestryBookmarks: createRESTEndpoints<IO<TapestryBookmarkDto>, IO<TapestryBookmarkCreateDto>>()({
    name: 'tapestry-bookmarks',
    schema: TapestryBookmarkSchema,
    endpoints: 'crdl',
    requireAuth: 'crdl',
    createParamsSchema: TapestryBookmarkCreateSchema,
  }),
  proxy: createRESTEndpoints<IO<ProxyDto>, IO<ProxyCreateDto>>()({
    name: 'proxy',
    schema: ProxySchema,
    endpoints: 'c',
    requireAuth: 'c',
    createParamsSchema: ProxyCreateSchema,
  }),
  tapestryCreateJob: createRESTEndpoints<
    IO<TapestryCreateJobDto>,
    IO<TapestryCreateJobCreateDto>
  >()({
    name: 'tapestry-create-jobs',
    schema: TapestryCreateJobSchema,
    endpoints: 'crl',
    requireAuth: 'crl',
    createParamsSchema: TapestryCreateJobCreateSchema,
  }),
  aiChats: createRESTEndpoints<IO<AIChatDto>, IO<AIChatCreateDto>>()({
    name: 'ai-chats',
    schema: AIChatSchema,
    endpoints: 'crdl',
    requireAuth: 'crdl',
    createParamsSchema: AIChatCreateSchema,
  }),
  aiChatMessages: createRESTEndpoints<IO<AIChatMessageDto>, IO<AIChatMessageCreateDto>>()({
    name: 'ai-chat-messages',
    allowedIncludes: ['attachments'],
    schema: AIChatMessageSchema,
    endpoints: 'crl',
    requireAuth: 'crl',
    createParamsSchema: AIChatMessageCreateSchema,
  }),
  groups: createRESTEndpoints<IO<GroupDto>, IO<GroupCreateDto>, IO<GroupUpdateDto>>()({
    name: 'groups',
    schema: GroupSchema,
    endpoints: 'crudl',
    requireAuth: 'cud',
    createParamsSchema: GroupCreateSchema,
    updateParamsSchema: GroupUpdateSchema,
  }),
  groupBatchMutations: createRESTEndpoints<
    IO<BatchMutationDto<GroupDto>>,
    IO<BatchMutationCreateDto<GroupCreateDto, GroupUpdateDto>>
  >()({
    name: 'group-batch-mutations',
    schema: batchMutation(GroupSchema),
    endpoints: 'c',
    requireAuth: 'c',
    createParamsSchema: batchMutationCreateParams(GroupCreateSchema, GroupUpdateSchema),
  }),
  userSecrets: createRESTEndpoints<
    IO<UserSecretDto>,
    IO<UserSecretCreateDto>,
    IO<UserSecretUpdateDto>
  >()({
    name: 'user-secrets',
    schema: UserSecretSchema,
    endpoints: 'crudl',
    requireAuth: 'crudl',
    createParamsSchema: UserSecretCreateSchema,
    updateParamsSchema: UserSecretUpdateSchema,
  }),
  featureRequests: createRESTEndpoints<IO<FeatureRequestDto>, IO<FeatureRequestCreateDto>>()({
    name: 'feature-requests',
    schema: FeatureRequestSchema,
    endpoints: 'cl',
    requireAuth: 'cl',
    createParamsSchema: FeatureRequestCreateSchema,
  }),
  tapestryExports: createRESTEndpoints<IO<TapestryExportDto>, IO<TapestryExportCreateDto>>()({
    name: 'tapestry-exports',
    schema: TapestryExportSchema,
    endpoints: 'c',
    requireAuth: 'c',
    createParamsSchema: TapestryExportCreateSchema,
  }),

  // ---- Admin-only resources ----
  adminTapestries: createRESTEndpoints<
    IO<AdminTapestryDto>,
    IO<never>,
    IO<AdminTapestryUpdateDto>
  >()({
    name: 'admin/tapestries',
    schema: AdminTapestrySchema,
    endpoints: 'rudl',
    requireAuth: 'rudl',
    updateParamsSchema: AdminTapestryUpdateSchema,
  }),
  adminFeatureRequests: createRESTEndpoints<
    IO<AdminFeatureRequestDto>,
    IO<never>,
    IO<AdminFeatureRequestUpdateDto>
  >()({
    name: 'admin/feature-requests',
    schema: AdminFeatureRequestSchema,
    endpoints: 'ul',
    requireAuth: 'ul',
    updateParamsSchema: AdminFeatureRequestUpdateSchema,
  }),
  adminUsers: createRESTEndpoints<IO<AdminUserDto>, IO<never>, IO<AdminUserUpdateDto>>()({
    name: 'admin/users',
    schema: AdminUserSchema,
    endpoints: 'ul',
    requireAuth: 'ul',
    updateParamsSchema: AdminUserUpdateSchema,
  }),
  // Creating an entry performs the admin action it describes (see AdminActivityCreateDto)
  adminActivity: createRESTEndpoints<IO<AdminActivityDto>, IO<AdminActivityCreateDto>>()({
    name: 'admin/activity',
    schema: AdminActivitySchema,
    endpoints: 'cl',
    requireAuth: 'cl',
    createParamsSchema: AdminActivityCreateSchema,
  }),
  adminReportQueries: createRESTEndpoints<IO<ReportDto>, IO<ReportQueryCreateDto>>()({
    name: 'admin/report-queries',
    schema: ReportSchema,
    endpoints: 'c',
    requireAuth: 'c',
    createParamsSchema: ReportQueryCreateSchema,
  }),
}

export type Resources = typeof resources
export type ResourceName = keyof typeof resources
export type Resource = Resources[ResourceName]
