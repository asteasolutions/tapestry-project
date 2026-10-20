import {
  LinearTransform,
  Rectangle,
  Size,
  ViewportObstruction,
} from 'tapestry-core/src/lib/geometry.js'
import { Group } from 'tapestry-core/src/data-format/schemas/group.js'
import { Item } from 'tapestry-core/src/data-format/schemas/item.js'
import { PresentationStep } from 'tapestry-core/src/data-format/schemas/presentation-step.js'
import { Rel } from 'tapestry-core/src/data-format/schemas/rel.js'
import { Tapestry } from 'tapestry-core/src/data-format/schemas/tapestry.js'
import { IdMap } from 'tapestry-core/src/utils.js'
import { Id } from 'tapestry-core/src/data-format/schemas/common'

export const MAX_SCALE = 4
export const MIN_RESTRICTED_SCALE = 0.5
export const MAX_RESTRICTED_SCALE = 1.5
export const ZOOM_STEP = 0.1
export const MAX_INITIAL_SCALE = 1

export interface Viewport {
  readonly transform: LinearTransform
  readonly size: Size
  readonly obstructions: IdMap<ViewportObstruction>
  readonly lastUpdateTimestamp?: number
  readonly ready: boolean
  readonly isZoomingLocked?: boolean
  //Minimum ratio of the viewport, which should be filled with content when zoomed out.
  //- Example value: 0.75 (requires 75% of content visible)
  readonly minZoomContentRatio: number

  //Maximum fraction of the viewport dimensions allowed to overflow outside the content bounds when panning.
  //Restricts how far the canvas can be translated relative to the screen.
  //- Example value: 0.55 (Max 55% off-canvas - guarantees at least 45% of the screen covers content)
  readonly maxTranslationRatio: number
}

export type PointerMode = 'pan' | 'select'

export interface PointerSelection {
  readonly rect: Rectangle
}

export interface TapestryElementRef {
  readonly modelType: 'item' | 'rel'
  readonly modelId: Id
}

export interface GroupModelRef {
  readonly modelType: 'group'
  readonly modelId: Id
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
  readonly snapshotId?: string | null
  readonly hasBeenActive?: boolean
  readonly isPlaying?: boolean
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
  /**
   * Tapestry items can be pre-rendered on the backend and then a tapestry client can display image representations
   * of tapestry items instead of the actual items as a performance optimization. In some cases these optimizations
   * may be unwanted - for example if the pre-rendered images for a given tapestry are corrupted or in other specific
   * scenarios where the DOM representations of the items need to be displayed directly. This flag controls whether
   * these optimizations are used when displaying the tapestry or not.
   */
  readonly disableOptimizations?: boolean
  readonly thumbnailsInitialized?: boolean
  readonly hideControls?: boolean
  readonly outlinedItemId?: string
  readonly searchTerm?: string | null
  readonly items: Readonly<IdMap<I>>
  readonly rels: Readonly<IdMap<R>>
  readonly groups: Readonly<IdMap<G>>
  readonly presentationSteps: Readonly<IdMap<P>>
  // TODO: try to figure out a way to put stricter types here
  readonly displaySidePane: string | null
}
