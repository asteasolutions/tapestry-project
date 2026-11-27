import { Container, Graphics, Rectangle } from 'pixi.js'
import { TapestryStage } from '..'
import { Store } from '../../lib/store'
import { ItemViewModel, TapestryViewModel } from '../../view-model'
import { obtainShadowNineSlice, ShadowNineSlice } from './shadow-texture-cache'
import { TapestryElementRenderer } from './tapestry-element-renderer'
import { ThumbnailContainer, ThumbnailContainerState } from './thumbnail-container'
import { ThemeName, THEMES } from '../../theme/themes'
import { LiteralColor } from '../../theme/types'
import { getPaletteColor } from '../../theme/design-system'
import { getItemOverlayScale } from '../../view-model/utils'
import { roundToPrecision } from 'tapestry-core/src/lib/algebra'
import {
  displayPersistedState,
  hasPersistedState,
  shouldDisplayDom,
} from '../../components/tapestry/tapestry-canvas'
import { snapshotRegistry } from '../controller/item-thumbnail-controller'
import { isHoveredItem } from '../utils'

export interface ItemRenderState<I extends ItemViewModel> {
  viewModel: I
  isInteractive: boolean
  disableOptimizations?: boolean
  theme: ThemeName
  dropShadow?: ShadowNineSlice
  thumbnailsInitialized?: boolean
  buttonState: ButtonState
}

// Hover/press feedback for action buttons, drawn over their thumbnail, and only there
type ButtonState = 'idle' | 'hover' | 'pressed'

const BUTTON_STATE_OVERLAY: Record<
  Exclude<ButtonState, 'idle'>,
  { color: LiteralColor; alpha: number }
> = {
  hover: { color: getPaletteColor('neutral.0'), alpha: 0.2 },
  pressed: { color: getPaletteColor('neutral.1000'), alpha: 0.1 },
}

type Icons = Record<
  'videoWebpage' | 'video' | 'audio' | 'pdf' | 'book' | 'webpage',
  (
    color: LiteralColor | undefined,
    background: LiteralColor | undefined,
    scale: number,
  ) => { minSize: number; icon: ThumbnailContainerState['icon'] }
>

const ICON_SIZE_STEP = 10
const ICONS: Icons = {
  videoWebpage: (color, background, scale) => {
    const size = roundToPrecision(130 * scale, ICON_SIZE_STEP)
    return {
      minSize: 120,
      icon: {
        background,
        props: {
          iconName: 'videoCam',
          size,
          color,
          fontSize: Math.round(0.3 * size),
        },
      },
    }
  },
  video: (color, background, scale) => {
    const size = roundToPrecision(130 * scale, ICON_SIZE_STEP)
    return {
      minSize: 120,
      icon: {
        background,
        props: {
          iconName: 'videoCam',
          size,
          color,
          fontSize: Math.round(0.3 * size),
        },
      },
    }
  },
  audio: (color, background, scale) => {
    const size = roundToPrecision(130 * scale, ICON_SIZE_STEP)
    return {
      minSize: 120,
      icon: {
        background,
        props: {
          iconName: 'volumeUp',
          size,
          color,
          fontSize: Math.round(0.37 * size),
        },
      },
    }
  },
  pdf: (color, background, scale) => {
    const size = roundToPrecision(100 * scale, ICON_SIZE_STEP)
    return {
      minSize: 100,
      icon: {
        background,
        props: {
          iconName: 'pdf',
          size,
          color,
          fontSize: Math.round(0.3 * size),
        },
      },
    }
  },
  book: (color, background, scale) => {
    const size = roundToPrecision(100 * scale, ICON_SIZE_STEP)
    return {
      minSize: 100,
      icon: {
        background,
        props: {
          iconName: 'book',
          size,
          color,
          fontSize: Math.round(0.3 * size),
        },
      },
    }
  },
  webpage: (color, background, scale) => {
    const size = roundToPrecision(100 * scale, ICON_SIZE_STEP)
    return {
      minSize: 100,
      icon: {
        background,
        props: {
          iconName: 'webpage',
          size,
          color,
          fontSize: Math.round(0.3 * size),
        },
      },
    }
  },
}

export class ItemRenderer<I extends ItemViewModel> extends TapestryElementRenderer<
  I,
  ItemRenderState<I>
> {
  private thumbnail: ThumbnailContainer
  // XXX: Here we assume there is a UI component called "dragArea" (see ItemController)
  // Maybe we should generalize this concept in some way as Tapestry viewer applications
  // would not have a "drag" area.
  private dragArea: Container
  private buttonOverlay = new Graphics({ eventMode: 'none' })
  private isPressed = false

  constructor(
    private itemStore: Store<TapestryViewModel>,
    private itemStage: TapestryStage,
    viewModel: I,
  ) {
    super(itemStore, itemStage, viewModel)
    this.thumbnail = new ThumbnailContainer(null, {
      borderRadius: 8,
      thumbnailPlacement: viewModel.dto.type === 'image' ? 'stretch' : 'cover',
    })
    this.dragArea = new Container({ label: 'dragArea', eventMode: 'static' })
    this.pixiContainer.addChild(this.thumbnail)
    this.pixiContainer.addChild(this.buttonOverlay)
    this.pixiContainer.addChild(this.dragArea)

    if (viewModel.dto.type === 'actionButton') {
      itemStage.root.addEventListener('pointerdown', this.onPointerDown)
      document.addEventListener('pointerup', this.onPointerUp)
      document.addEventListener('pointercancel', this.onPointerUp)
    }
  }

  dispose(): void {
    this.itemStage.root.removeEventListener('pointerdown', this.onPointerDown)
    document.removeEventListener('pointerup', this.onPointerUp)
    document.removeEventListener('pointercancel', this.onPointerUp)
    super.dispose()
  }

  /** Whether action buttons show hover/press feedback. The editor turns it off in edit mode. */
  protected hasButtonFeedback() {
    return true
  }

  private isHovered(id: string) {
    const pointerInteraction = this.itemStore.get('pointerInteraction')
    return (
      pointerInteraction?.action === 'hover' &&
      isHoveredItem(pointerInteraction.target) &&
      pointerInteraction.target.modelId === id
    )
  }

  private obtainButtonState(viewModel: I): ButtonState {
    const { id, type } = viewModel.dto
    if (type !== 'actionButton' || !this.hasButtonFeedback()) return 'idle'
    if (this.isPressed) return 'pressed'
    return this.isHovered(id) ? 'hover' : 'idle'
  }

  private setPressed(isPressed: boolean) {
    if (this.isPressed === isPressed) return
    this.isPressed = isPressed
    const viewModel = this.itemStore.get(`items.${this.pixiContainer.modelRef.modelId}`)
    if (viewModel) {
      this.render(viewModel as I)
      this.itemStage.pixi.tapestry.scheduleRedraw()
    }
  }

  private onPointerDown = () => {
    if (this.isHovered(this.pixiContainer.modelRef.modelId)) this.setPressed(true)
  }

  private onPointerUp = () => this.setPressed(false)

  protected doRender(state: ItemRenderState<I>): void {
    this.updateHitArea(state)
    this.updateThumbnail(state)
    this.updateButtonOverlay(state)
  }

  private updateButtonOverlay({ viewModel, buttonState }: ItemRenderState<I>) {
    this.buttonOverlay.clear()
    if (buttonState === 'idle' || !this.thumbnail.visible) return

    const { position, size } = viewModel.dto
    this.buttonOverlay
      .roundRect(position.x, position.y, size.width, size.height, 8)
      .fill(BUTTON_STATE_OVERLAY[buttonState])
  }

  protected obtainRenderState(
    viewModel: I,
    store: Store<TapestryViewModel>,
    stage: TapestryStage,
  ): ItemRenderState<I> {
    return {
      viewModel,
      isInteractive: store.get('interactiveElement.modelId') === viewModel.dto.id,
      disableOptimizations: store.get('disableOptimizations'),
      theme: store.get('theme'),
      dropShadow: viewModel.dto.dropShadow
        ? obtainShadowNineSlice(stage.pixi.tapestry.app.renderer, 8)
        : undefined,
      thumbnailsInitialized: store.get('thumbnailsInitialized'),
      buttonState: this.obtainButtonState(viewModel),
    }
  }

  private updateHitArea({ viewModel }: ItemRenderState<I>) {
    const { position, size } = viewModel.dto
    this.dragArea.hitArea = new Rectangle(position.x, position.y, size.width, size.height)
  }

  private updateThumbnail({
    viewModel,
    isInteractive,
    disableOptimizations,
    theme,
    dropShadow,
    thumbnailsInitialized,
  }: ItemRenderState<I>) {
    const snapshot = viewModel.snapshotId && snapshotRegistry[viewModel.snapshotId]
    if (
      shouldDisplayDom({ disableOptimizations, isInteractive, thumbnailsInitialized }, viewModel) ||
      (hasPersistedState(viewModel) && displayPersistedState)
    ) {
      this.thumbnail.visible = false
    } else {
      const { position, size } = viewModel.dto
      this.thumbnail.visible = true
      this.thumbnail.texture = snapshot || 'placeholder'
      this.thumbnail.position = position
      this.thumbnail.update({
        size,
        icon: this.obtainIconOverlay(
          viewModel,
          THEMES[theme].color('background.primary'),
          THEMES[theme].color('background.mono'),
        ),
        dropShadow,
      })
    }
  }

  private obtainIconOverlay(
    viewModel: I,
    color: LiteralColor | undefined,
    backgroundColor: LiteralColor | undefined,
  ) {
    const { type, size } = viewModel.dto
    const isVideoWebpage =
      type === 'webpage' &&
      ['iaVideo', 'youtube', 'vimeo', 'googleDriveVideo'].includes(viewModel.dto.webpageType ?? '')

    const iconKey: keyof Icons | undefined = isVideoWebpage
      ? 'videoWebpage'
      : type === 'audio' ||
          type === 'video' ||
          type === 'pdf' ||
          type === 'book' ||
          type === 'webpage'
        ? type
        : undefined

    const scale = getItemOverlayScale(size)
    const { minSize = 0, icon } = (iconKey && ICONS[iconKey](color, backgroundColor, scale)) ?? {}

    return Math.min(size.width, size.height) > minSize ? icon : undefined
  }
}
