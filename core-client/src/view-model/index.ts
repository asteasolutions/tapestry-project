import {
  DirectionalOffsets,
  LinearTransform,
  Rectangle,
  Size,
} from 'tapestry-core/src/lib/geometry.js'
import { Group } from 'tapestry-core/src/data-format/schemas/group.js'
import { Item } from 'tapestry-core/src/data-format/schemas/item.js'
import { PresentationStep } from 'tapestry-core/src/data-format/schemas/presentation-step.js'
import { Rel } from 'tapestry-core/src/data-format/schemas/rel.js'
import { Tapestry } from 'tapestry-core/src/data-format/schemas/tapestry.js'
import { IdMap } from 'tapestry-core/src/utils.js'

export const MAX_SCALE = 4
export const MIN_RESTRICTED_SCALE = 0.5
export const MAX_RESTRICTED_SCALE = 1.5
export const ZOOM_STEP = 0.1
export const MAX_INITIAL_SCALE = 1

export interface Viewport {
  readonly transform: LinearTransform
  readonly size: Size
  readonly focusRectInsets: Record<string, DirectionalOffsets>
  readonly lastUpdateTimestamp?: number
  readonly ready: boolean
  readonly isZoomingLocked?: boolean
}

export type PointerMode = 'pan' | 'select'

export interface PointerSelection {
  readonly rect: Rectangle
}

export interface TapestryElementRef {
  readonly modelType: 'item' | 'rel'
  readonly modelId: string
}

interface BaseHoverTarget {
  readonly uiComponent?: string | null
}

interface ModelHoverTarget extends BaseHoverTarget {
  readonly modelId: string
}

export type HoveredItem = ModelHoverTarget & { readonly type: 'item' }
export type HoveredRel = ModelHoverTarget & { readonly type: 'rel' }
export type HoveredGroup = ModelHoverTarget & { readonly type: 'group' }
export type HoveredMultiselection = BaseHoverTarget & { readonly type: 'multiselection' }

export type HoverTarget = HoveredItem | HoveredRel | HoveredGroup | HoveredMultiselection

export interface PointerInteraction {
  readonly action:
    | 'pan-scroll'
    | 'pan-drag'
    | 'zoom-in'
    | 'zoom-out'
    | 'hover'
    | 'select'
    // XXX: These pointer actions are used only when editing a tapestry, but are included here
    // since there is no easy way in TS to extend this union type in descendants
    | 'drag'
    | 'resize'
  readonly target?: HoverTarget | null
  readonly constrainToLayer?: 'pixi' | 'dom' | null
}

export interface ItemViewModel<I extends Item = Item> {
  readonly dto: I
  readonly hasBeenActive?: boolean
}

export interface RelViewModel<R extends Rel = Rel> {
  readonly dto: R
}

export type RelEndpointName = 'from' | 'to'

export type TapestryElementViewModel = ItemViewModel | RelViewModel

export interface GroupViewModel<G extends Group = Group> {
  readonly dto: G
}

export interface PresentationStepViewModel<P extends PresentationStep = PresentationStep> {
  readonly dto: P
}

export interface Selection {
  readonly itemIds: Set<string>
  readonly groupIds: Set<string>
}

export interface SnackbarData {
  readonly text: string
  readonly duration?: number
  readonly variant?: 'normal' | 'warning' | 'error' | 'success'
}

export interface TapestryViewModel<
  I extends ItemViewModel = ItemViewModel,
  R extends RelViewModel = RelViewModel,
  G extends GroupViewModel = GroupViewModel,
  P extends PresentationStepViewModel = PresentationStepViewModel,
> extends Omit<Tapestry, 'items' | 'rels' | 'groups'> {
  readonly viewport: Viewport
  readonly selection: Selection
  readonly pointerMode: PointerMode
  readonly pointerInteraction?: PointerInteraction | null
  readonly pointerSelection?: PointerSelection | null
  readonly interactiveElement?: TapestryElementRef | null
  readonly snackbarData?: SnackbarData
  readonly delayItemLoad?: boolean
  readonly outlinedItemId?: string
  readonly searchTerm?: string | null
  readonly items: Readonly<IdMap<I>>
  readonly rels: Readonly<IdMap<R>>
  readonly groups: Readonly<IdMap<G>>
  readonly presentationSteps: Readonly<IdMap<P>>
  // TODO: try to figure out a way to put stricter types here
  readonly displaySidePane: string | null
}
