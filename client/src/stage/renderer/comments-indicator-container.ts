import { Container, ContainerOptions, Graphics, Rectangle, Text } from 'pixi.js'
import { LiteralColor } from 'tapestry-core/src/lib/string'
import { DESIGN_SYSTEM } from 'tapestry-core-client/src/theme/design-system'
import { Theme } from 'tapestry-core-client/src/theme/themes'
import Color from 'color'

const HEIGHT = 32
const HORIZONTAL_PADDING = 8
const BORDER_RADIUS = 8
const ICON_GAP = 2

export interface CommentsIndicatorContainerState {
  bgColor: LiteralColor
  fgColor: LiteralColor
  commentsCount: number
}

type CommentsIndicatorAnchor = 'bottom-right' | 'center'

export class CommentsIndicatorContainer extends Container {
  private state: CommentsIndicatorContainerState
  private textContainer: Container = new Container()
  private commentsIndicatorBackground = new Graphics()
  private commentsCountText: Text
  private chatIcon: Text
  private anchor: CommentsIndicatorAnchor

  constructor(
    state: CommentsIndicatorContainerState,
    anchor: CommentsIndicatorAnchor,
    containerOpts: ContainerOptions = {},
  ) {
    super({
      label: 'commentsIndicator',
      eventMode: 'static',
      interactiveChildren: false,
      ...containerOpts,
    })
    this.state = state
    this.anchor = anchor

    this.commentsIndicatorBackground.y = this.textContainer.y = this.anchorOffset * HEIGHT
    this.addChild(this.commentsIndicatorBackground)
    this.addChild(this.textContainer)

    const { commentsCount } = state

    this.chatIcon = new Text({
      text: 'chat_bubble',
      resolution: 4,
      anchor: {
        x: 0,
        y: 0.5,
      },
      style: {
        fontFamily: 'Material Symbols Outlined',
        fontSize: '16px',
      },
      x: HORIZONTAL_PADDING,
      y: HEIGHT / 2 + 3,
    })
    this.textContainer.addChild(this.chatIcon)

    const { fontFamily, fontSize } = DESIGN_SYSTEM.typography.body

    this.commentsCountText = new Text({
      resolution: 4,
      anchor: {
        x: 0,
        y: 0.5,
      },
      style: {
        fontFamily,
        fontSize,
      },
      x: HORIZONTAL_PADDING + this.chatIcon.width + ICON_GAP,
      y: HEIGHT / 2,
    })
    this.textContainer.addChild(this.commentsCountText)

    this.updateCommentsCountText(commentsCount)
    this.updateFgColor()
    this.updateBgColor()
  }

  update(newState: CommentsIndicatorContainerState) {
    const { commentsCount, bgColor, fgColor } = newState

    if (commentsCount !== this.state.commentsCount) {
      this.updateCommentsCountText(commentsCount)
    }

    if (bgColor !== this.state.bgColor) {
      this.updateBgColor(bgColor)
    }

    if (fgColor !== this.state.fgColor) {
      this.updateFgColor(fgColor)
    }

    this.state = newState
  }

  get anchorOffset() {
    return this.anchor === 'bottom-right' ? -1 : -1 / 2
  }

  public static getDefaultFgColor(bgColor: LiteralColor, theme: Theme) {
    return Color(bgColor).isLight() === (theme.name === 'light')
      ? theme.color('text.primary')
      : theme.color('text.primaryInverse')
  }

  private updateFgColor(color: LiteralColor = this.state.fgColor) {
    this.commentsCountText.style.fill = color
    this.chatIcon.style.fill = color
  }

  private updateBgColor(color: LiteralColor = this.state.bgColor) {
    this.commentsIndicatorBackground.tint = color
  }

  private updateCommentsCountText(count: number) {
    this.commentsCountText.text = ` ${count} Comment${count === 1 ? '' : 's'}`
    this.updateCommentsIndicatorBackground()
  }

  private updateCommentsIndicatorBackground() {
    const calculatedWidth =
      2 * HORIZONTAL_PADDING + this.chatIcon.width + ICON_GAP + this.commentsCountText.width

    this.commentsIndicatorBackground.x = this.textContainer.x = this.anchorOffset * calculatedWidth

    this.commentsIndicatorBackground.clear()
    this.commentsIndicatorBackground
      .roundRect(0, 0, calculatedWidth, HEIGHT, BORDER_RADIUS)
      .fill({ color: 'white' })
      .stroke({ width: 1, color: '#b6bcc3' })

    const { x, y } = this.commentsIndicatorBackground.position
    this.hitArea = new Rectangle(x, y, calculatedWidth, HEIGHT)
  }
}
