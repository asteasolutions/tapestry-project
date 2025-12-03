import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { CommentDto } from 'tapestry-shared/src/data-transfer/resources/dtos/comment'
import { Rectangle, Size } from 'tapestry-core/src/lib/geometry'
import { UserAccess } from '../../../model/data/utils'
import { PresentationStepDto } from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step'
import { IAItemMetadata } from 'tapestry-core/src/internet-archive'
import { Point } from 'tapestry-core/src/data-format/schemas/common'
import { RelEndpoint } from 'tapestry-core/src/data-format/schemas/rel'
import {
  TapestryViewModel,
  ItemViewModel,
  RelEndpointName,
  RelViewModel,
  GroupViewModel,
  PresentationStepViewModel,
} from 'tapestry-core-client/src/view-model'
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { Store } from 'tapestry-core-client/src/lib/store'
import { RelDto } from 'tapestry-shared/src/data-transfer/resources/dtos/rel'
import { GroupDto } from 'tapestry-shared/src/data-transfer/resources/dtos/group'
import { cast } from 'tapestry-core-client/src/lib/store/ugly-cast'
import { LiteralColor } from 'tapestry-core-client/src/theme/types'
import { PublicUserProfileDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { IdMap } from 'tapestry-core/src/utils'
import { RequiredFields } from 'tapestry-core/src/type-utils'

export const ITEM_UI_COMPONENTS = [
  'dragHandle',
  'dragArea',
  'resizeHandleTop',
  'resizeHandleRight',
  'resizeHandleBottom',
  'resizeHandleLeft',
  'resizeHandleTopRight',
  'resizeHandleBottomRight',
  'resizeHandleBottomLeft',
  'resizeHandleTopLeft',
  'createRelAnchorTop',
  'createRelAnchorRight',
  'createRelAnchorBottom',
  'createRelAnchorLeft',
] as const
export type ItemUIComponent = (typeof ITEM_UI_COMPONENTS)[number]

export type DirectionMask = Partial<Record<'top' | 'right' | 'bottom' | 'left', boolean>>

export const REL_UI_COMPONENTS = [
  'toolbar',
  'line',
  'line-highlight-from',
  'line-highlight-to',
  'from-arrowhead',
  'to-arrowhead',
] as const
export type RelUIComponent = (typeof REL_UI_COMPONENTS)[number]

export const MULTI_SELECTION_UI_COMPONENTS = [
  'dragArea',
  'resizeHandleTop',
  'resizeHandleRight',
  'resizeHandleBottom',
  'resizeHandleLeft',
  'resizeHandleTopRight',
  'resizeHandleBottomRight',
  'resizeHandleBottomLeft',
  'resizeHandleTopLeft',
] as const
export type MultiselectionUIComponent = (typeof MULTI_SELECTION_UI_COMPONENTS)[number]

export interface CommentThread {
  readonly firstComment?: CommentDto
  readonly size: number
}

export interface ItemResizeState {
  readonly initialBounds: Rectangle
  readonly relativePositionInSelection: Point
  readonly minSize: Size
  readonly maxSize: Size
}

export interface ItemDragState {
  readonly initialPosition: ItemDto['position']
}

export interface SelectionDragState {
  readonly initialPosition: Point
  readonly position: Point
}

export interface SelectionResizeState {
  readonly bounds?: Rectangle
  readonly initialBounds: Rectangle
  readonly direction: DirectionMask
  readonly minSize: Size
}

export interface EditableItemViewModel<I extends ItemDto = ItemDto> extends ItemViewModel<I> {
  readonly commentThread?: CommentThread

  readonly dragState?: ItemDragState | null
  readonly resizeState?: ItemResizeState | null
  readonly previewBounds?: Rectangle | null
}

export interface RelDragState {
  readonly endpoint: RelEndpointName
  readonly position: Point | Omit<RelEndpoint, 'arrowhead'>
}

export interface EditableRelViewModel extends RelViewModel<RelDto> {
  readonly commentThread?: CommentThread

  readonly dragState?: RelDragState | null
}

export type EditableGroupViewModel = GroupViewModel<GroupDto>
export type EditablePresentationStepViewModel = PresentationStepViewModel<PresentationStepDto>

export type EditableTapestryElementViewModel = EditableItemViewModel | EditableRelViewModel

export interface Guidelines {
  readonly spacing: number
}

export type InteractionMode = 'view' | 'edit'

export interface PresentationOrderState {
  readonly dragState?: {
    readonly stepIndex: number
    readonly position: Point
    readonly dropTarget?: {
      type: PresentationStepDto['type']
      id: string
    }
  }
}

export interface PlaylistEntry {
  filename: string
  duration: number
  title: string
}

export type IAImport =
  | {
      type: 'IACollection'
      id: string
      metadata: IAItemMetadata['metadata']
    }
  | {
      type: 'IAPlaylist'
      id: string
      metadata: IAItemMetadata['metadata']
      entries: PlaylistEntry[]
    }

export interface Collaborator {
  id: string
  userData: PublicUserProfileDto
  color: LiteralColor
  cursorPosition?: Point
}
export type ActiveCollaborator = RequiredFields<Collaborator, 'cursorPosition'>

export type TapestryWithOwner<T extends Partial<TapestryDto>> = RequiredFields<T, 'owner'>

export interface EditableTapestryViewModel
  extends
    TapestryViewModel<
      EditableItemViewModel,
      EditableRelViewModel,
      EditableGroupViewModel,
      EditablePresentationStepViewModel
    >,
    TapestryWithOwner<
      Pick<
        TapestryDto,
        'slug' | 'visibility' | 'allowForking' | 'createdAt' | 'updatedAt' | 'ownerId' | 'owner'
      >
    > {
  readonly interactionMode: InteractionMode
  readonly userAccess: UserAccess
  readonly viewportGuidelines?: Guidelines
  readonly selectionDragState?: SelectionDragState | null
  readonly selectionResizeState?: SelectionResizeState | null
  readonly copiedItemSize?: Size
  readonly commentThread?: CommentThread
  readonly largeFiles: File[]
  readonly presentationOrderState?: PresentationOrderState | null
  readonly iaImport?: IAImport | null
  readonly pendingRequests: number
  readonly newRelPreview?: EditableRelViewModel | null
  readonly hideEditControls?: boolean
  readonly collaborators: Readonly<IdMap<Collaborator>>
}

export type TapestryEditorStore = Store<EditableTapestryViewModel, { base: TapestryViewModel }>
export const convertCommand = cast<TapestryEditorStore>()
