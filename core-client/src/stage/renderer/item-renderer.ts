import { Rectangle, Texture } from 'pixi.js'
import { TapestryStage } from '..'
import { Store } from '../../lib/store'
import { ItemViewModel, TapestryViewModel } from '../../view-model'
import { obtainShadowNineSlice, ShadowNineSlice } from './shadow-texture-cache'
import { TapestryElementRenderer } from './tapestry-element-renderer'
import { ThumbnailContainer, ThumbnailContainerState } from './thumbnail-container'
import { IdMap } from 'tapestry-core/src/utils'
import { THEMES } from '../../theme/themes'
import { LiteralColor } from '../../theme/types'
import { getItemOverlayScale } from '../../view-model/utils'
import { roundToPrecision } from 'tapestry-core/src/lib/algebra'

export const snapshotRegistry: IdMap<Texture> = {}

export interface ItemRenderState<I extends ItemViewModel> {
  viewModel: I
  isInteractive: boolean
  disableOptimizations?: boolean
  iconColor?: LiteralColor
  iconBackgroundColor?: LiteralColor
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
    const size = roundToPrecision(100 * scale, ICON_SIZE_STEP)
    return {
      minSize: 220,
      icon: {
        background,
        props: {
          iconName: 'videoCam',
          size,
          color,
          fontSize: Math.round(0.6 * size),
        },
      },
    }
  },
  video: (color, background, scale) => ({
    minSize: 220,
    icon: {
      background,
      props: {
        iconName: 'playArrow',
        size: roundToPrecision(100 * scale, ICON_SIZE_STEP),
        color,
      },
    },
  }),
  audio: (color, background, scale) => {
    const size = roundToPrecision(100 * scale, ICON_SIZE_STEP)
    return {
      minSize: 220,
      icon: {
        background,
        props: {
          iconName: 'volumeUp',
          size,
          color,
          fontSize: Math.round(0.75 * size),
        },
      },
    }
  },
  pdf: (color, background, scale) => {
    const size = roundToPrecision(80 * scale, ICON_SIZE_STEP)
    return {
      minSize: 200,
      icon: {
        background,
        props: {
          iconName: 'pdf',
          size,
          color,
          fontSize: Math.round(0.625 * size),
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

  constructor(store: Store<TapestryViewModel>, stage: TapestryStage, viewModel: I) {
    super(store, stage, viewModel)
    this.thumbnail = new ThumbnailContainer(
      null,
      { borderRadius: 8, thumbnailPlacement: viewModel.dto.type === 'image' ? 'stretch' : 'cover' },
      { label: `thumbnail-container-${viewModel.dto.id}`, interactiveChildren: false },
    )
    this.pixiContainer.addChild(this.thumbnail)
    this.pixiContainer.eventMode = 'static'
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
    const theme = THEMES[store.get('theme')]
    return {
      viewModel,
      isInteractive: store.get('interactiveElement.modelId') === viewModel.dto.id,
      disableOptimizations: store.get('disableOptimizations'),
      iconColor: theme.color('background.primary'),
      iconBackgroundColor: theme.color('background.mono'),
      dropShadow: viewModel.dto.dropShadow
        ? obtainShadowNineSlice(stage.pixi.tapestry.app.renderer, 8)
        : undefined,
    }
  }

  private updateHitArea({ viewModel }: ItemRenderState<I>) {
    const { position, size } = viewModel.dto
    this.pixiContainer.hitArea = new Rectangle(position.x, position.y, size.width, size.height)
  }

  private updateThumbnail({
    viewModel,
    isInteractive,
    disableOptimizations,
    iconColor,
    iconBackgroundColor,
    dropShadow,
  }: ItemRenderState<I>) {
    const snapshot = viewModel.snapshotId && snapshotRegistry[viewModel.snapshotId]
    if (disableOptimizations || isInteractive || viewModel.isPlaying || !snapshot) {
      this.thumbnail.visible = false
    } else {
      const { position, size } = viewModel.dto
      this.thumbnail.visible = true
      this.thumbnail.texture = snapshot
      this.thumbnail.position = position
      this.thumbnail.update({
        size,
        icon: this.obtainIconOverlay(viewModel, iconColor, iconBackgroundColor),
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
