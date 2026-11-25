import { ItemCreateInTapestryDto, ItemDto } from './item.js'
import { RelCreateInTapestryDto, RelDto } from './rel.js'
import { BaseResourceDto } from './common.js'
import { PublicUserProfileDto } from './user.js'
import { TapestryAccessDto } from './tapestry-access.js'
import { TapestryInvitationDto } from './tapestry-invitation.js'
import { GroupDto } from './group.js'
import { Tapestry } from 'tapestry-core/src/data-format/schemas/tapestry.js'

export const TAPESTRY_VISIBILITIES = ['private', 'link'] as const

export type TapestryVisibility = (typeof TAPESTRY_VISIBILITIES)[number]

export interface TapestryDto extends Omit<Tapestry, 'items' | 'rels' | 'groups'>, BaseResourceDto {
  ownerId: string
  owner?: PublicUserProfileDto | null
  visibility: TapestryVisibility
  featured: boolean
  slug: string
  items?: ItemDto[] | null
  rels?: RelDto[] | null
  groups?: GroupDto[] | null
  parentId?: string | null
  userAccess?: Omit<TapestryAccessDto, 'tapestryId'>[] | null
  userInvitations?: Omit<TapestryInvitationDto, 'tapestryId'>[] | null
  allowForking: boolean
}

type TapestryReadonlyProps =
  | keyof BaseResourceDto
  | 'owner'
  | 'ownerId'
  | 'userAccess'
  | 'userInvitations'
  | 'parentId'
  | 'items'
  | 'rels'
  | 'groups'
  | 'featured'

export type TapestryCreateDto = Omit<
  TapestryDto,
  Exclude<TapestryReadonlyProps, 'parentId'> | 'slug' | 'allowForking'
> & {
  items: ItemCreateInTapestryDto[]
  rels: RelCreateInTapestryDto[]
} & Partial<Pick<TapestryDto, 'slug' | 'allowForking'>>

export type TapestryUpdateDto = Partial<Omit<TapestryDto, TapestryReadonlyProps>>
