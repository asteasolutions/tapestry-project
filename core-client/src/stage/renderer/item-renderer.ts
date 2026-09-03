import { Container, Rectangle } from 'pixi.js'
import { TapestryStage } from '..'
import { Store } from '../../lib/store'
import { ItemViewModel, TapestryViewModel } from '../../view-model'
import { obtainShadowNineSlice, ShadowNineSlice } from './shadow-texture-cache'
import { TapestryElementRenderer } from './tapestry-element-renderer'
import { ThumbnailContainer, ThumbnailContainerState } from './thumbnail-container'
import { ThemeName, THEMES } from '../../theme/themes'
import { LiteralColor } from '../../theme/types'
import { getItemOverlayScale } from '../../view-model/utils'
import { roundToPrecision } from 'tapestry-core/src/lib/algebra'
import {
  displayPersistedState,
  hasPersistentState,
} from '../../components/tapestry/tapestry-canvas'
import { snapshotRegistry } from '../controller/item-thumbnail-controller'

export interface ItemRenderState<I extends ItemViewModel> {
  viewModel: I
  isInteractive: boolean
  disableOptimizations?: boolean
  theme: ThemeName
  dropShadow?: ShadowNineSlice
}

type Icons = Record<
  'videoWebpage' | 'video' | 'audio' | 'pdf',
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

  constructor(store: Store<TapestryViewModel>, stage: TapestryStage, viewModel: I) {
    super(store, stage, viewModel)
    this.thumbnail = new ThumbnailContainer(null, {
      borderRadius: 8,
      thumbnailPlacement: viewModel.dto.type === 'image' ? 'stretch' : 'cover',
    })
    this.dragArea = new Container({ label: 'dragArea', eventMode: 'static' })
    this.pixiContainer.addChild(this.thumbnail)
    this.pixiContainer.addChild(this.dragArea)
  }

  protected doRender(state: ItemRenderState<I>): void {
    this.updateHitArea(state)
    this.updateThumbnail(state)
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
  }: ItemRenderState<I>) {
    const snapshot = viewModel.snapshotId && snapshotRegistry[viewModel.snapshotId]
    const shouldDisplayDom =
      disableOptimizations || isInteractive || viewModel.isPlaying || !snapshot
    if (
      shouldDisplayDom ||
      (viewModel.hasBeenActive && hasPersistentState(viewModel.dto.type) && displayPersistedState)
    ) {
      this.thumbnail.visible = false
    } else {
      const { position, size } = viewModel.dto
      this.thumbnail.visible = true
      this.thumbnail.texture = snapshot
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
      ['iaVideo', 'youtube', 'vimeo'].includes(viewModel.dto.webpageType ?? '')

    const iconKey: keyof Icons | undefined = isVideoWebpage
      ? 'videoWebpage'
      : type === 'audio' || type === 'video' || type === 'pdf'
        ? type
        : undefined

    const scale = getItemOverlayScale(size)
    const { minSize = 0, icon } = (iconKey && ICONS[iconKey](color, backgroundColor, scale)) ?? {}

    return Math.min(size.width, size.height) > minSize ? icon : undefined
  }
}
