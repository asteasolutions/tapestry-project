import { Graphics, Text, TextOptions, TextStyle } from 'pixi.js'
import {
  EditableTapestryViewModel,
  PresentationOrderState,
  TapestryEditorStore,
} from '../../pages/tapestry/view-model'
import { getPresentationSequence, idMapToArray } from 'tapestry-core/src/utils'
import {
  add,
  mul,
  normalize,
  Point,
  Rectangle,
  Size,
  Vector,
  vector,
} from 'tapestry-core/src/lib/geometry'
import { getPaletteColor } from 'tapestry-core-client/src/theme/design-system'
import { PresentationStepDto } from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step'
import { getPresentedModelId } from 'tapestry-core/src/utils'
import { mapValues } from 'lodash'
import { TapestryStage } from 'tapestry-core-client/src/stage'
import {
  computeRestrictedScale,
  getBoundingRectangle,
  getGroupMembers,
  getPresentationIndex,
  MULTISELECT_RECTANGLE_PADDING,
} from 'tapestry-core-client/src/view-model/utils'
import { Renderer } from 'tapestry-core-client/src/stage/renderer'
import { drawCurve } from 'tapestry-core-client/src/stage/renderer/rel-renderer'
import { computeCurvePoints } from 'tapestry-core-client/src/view-model/rel-geometry'

interface PresentationStepUI {
  bounds: Rectangle
  overlay: Graphics
  slot: Graphics
  text: Text
  line: Graphics
  type: PresentationStepDto['type']
  hovered?: boolean
}

const SLOT_RADII: Record<PresentationStepDto['type'], number> = {
  item: 15,
  group: 21,
}

interface StepOverlayOptions {
  position: Point
  size: Size
  scale: number
  isDropTarget: boolean
  isPartOfPresentation: boolean
}

export class PresentationOrderRenderer implements Renderer<EditableTapestryViewModel> {
  private ui: Partial<Record<string, PresentationStepUI>> = {}
  private draggedStep: {
    slot: Graphics
    text: Text
  } | null = null

  constructor(
    private store: TapestryEditorStore,
    private stage: TapestryStage<'presentationOrder'>,
  ) {
    this.render(this.store.get())
    stage.pixi.presentationOrder.stage.on('globalpointermove', (e) => {
      const point = new Rectangle(
        this.stage.pixi.presentationOrder.stage.worldTransform.applyInverse(e),
        { width: 0, height: 0 },
      )
      Object.entries(this.ui).forEach(([id, ui]) => {
        if (!ui) {
          return
        }
        const inside = new Rectangle(ui.bounds).contains(point)
        let shouldRedraw = false
        if (ui.hovered && !inside) {
          ui.hovered = false
          shouldRedraw = true
        } else if (!ui.hovered && inside) {
          ui.hovered = true
          shouldRedraw = true
        }
        if (shouldRedraw) {
          const dragState = this.store.get('presentationOrderState.dragState')
          const presentationSteps = this.store.get('presentationSteps')
          const sequence = getPresentationSequence(mapValues(presentationSteps, (vm) => vm?.dto))
          this.drawOverlay(id, ui.type, sequence, dragState, this.computeScale())
        }
      })
    })
  }

  dispose(): void {
    this.stage.pixi.presentationOrder.stage.removeChildren()
  }

  render(_model: EditableTapestryViewModel): void {
    this.removeMissing()
    this.updateViewportTransform()
    this.drawOverlays()
    this.drawLines()
  }

  private createText(options?: TextOptions) {
    return new Text({
      style: new TextStyle({
        fontFamily: 'Plus Jakarta Sans',
        fill: getPaletteColor('neutral.0'),
      }),
      anchor: { x: 0.5, y: 0.5 },
      eventMode: 'none',
      ...options,
    })
  }

  private createStepUI(type: PresentationStepDto['type'], id: string) {
    let bounds: Rectangle
    if (type === 'group') {
      const groupItems = getGroupMembers(id, idMapToArray(this.store.get('items')))
      bounds = getBoundingRectangle(groupItems).expand(MULTISELECT_RECTANGLE_PADDING)
    } else {
      const itemDto = this.store.get(`items.${id}.dto`)!
      bounds = new Rectangle(itemDto.position, itemDto.size)
    }
    let ui = this.ui[id]
    if (ui) {
      ui.bounds = bounds
      return
    }
    ui = {
      bounds,
      type,
      overlay: new Graphics({ label: `${type}_${id}_overlay`, eventMode: 'static', zIndex: 0 }),
      line: new Graphics({ label: `${type}_${id}_line`, eventMode: 'none', zIndex: 1 }),
      slot: new Graphics({ label: `${type}_${id}_slot`, eventMode: 'static', zIndex: 2 }),
      text: this.createText({ zIndex: 3 }),
    }
    this.stage.pixi.presentationOrder.stage.addChild(ui.overlay, ui.slot, ui.text, ui.line)
    this.ui[id] = ui
  }

  private drawStepOverlay({ overlay, hovered }: PresentationStepUI, opts: StepOverlayOptions) {
    overlay
      .clear()
      .roundRect(opts.position.x, opts.position.y, opts.size.width, opts.size.height, 8)
      .fill({ alpha: 0 })
      .stroke({
        color:
          opts.isDropTarget || hovered
            ? getPaletteColor('success.300')
            : opts.isPartOfPresentation
              ? getPaletteColor('success.100')
              : getPaletteColor('neutral.200'),
        width: (hovered && !opts.isDropTarget ? 3 : 2) * opts.scale,
      })
  }

  private drawSlot(
    { slot, hovered }: Pick<PresentationStepUI, 'slot' | 'hovered'>,
    text: Text,
    opts: { center: Point; scale: number; text: string; radius: number },
  ) {
    const shouldFill = !!opts.text || (hovered && !this.draggedStep)

    text.position = opts.center
    text.text = opts.text
    text.style.fontSize = Math.round(16 * opts.scale)

    slot
      .clear()
      .circle(opts.center.x, opts.center.y, opts.radius * opts.scale)
      .fill({
        color: shouldFill ? getPaletteColor('success.300') : getPaletteColor('neutral.200'),
      })
      .stroke({
        color: shouldFill ? getPaletteColor('success.100') : getPaletteColor('neutral.0'),
        width: (shouldFill ? 2 : 1) * opts.scale,
      })
  }

  private computeScale() {
    const items = idMapToArray(this.store.get('items'))
    const viewport = this.store.get('viewport')
    return computeRestrictedScale(viewport, items) / viewport.transform.scale
  }

  /**
   * Given a curve which passes through each of the given points in sequence,
   * this method computes the tangent vectors for the curve at each point, i.e.
   * the direction in which the curve should turn at each point in order to head to the next one.
   */
  private computeTangents(points: Point[]) {
    return points.map((point, index): Vector | undefined => {
      if (index === 0 || index === points.length - 1) return undefined

      const a = normalize(vector(point, points[index - 1]))
      const b = normalize(vector(point, points[index + 1]))
      if (a.dx === -b.dx && a.dy === -b.dy) return b

      const bisectrix = normalize(add(a, b))
      const dir = Math.sign(a.dx * b.dy - a.dy * b.dx) || 1
      return { dx: -dir * bisectrix.dy, dy: dir * bisectrix.dx }
    })
  }

  private drawOverlays() {
    const dragState = this.store.get('presentationOrderState.dragState')
    const presentationSteps = mapValues(this.store.get('presentationSteps'), (vm) => vm?.dto)
    const sequence = getPresentationSequence(presentationSteps)
    const scale = this.computeScale()

    const allItems = idMapToArray(this.store.get('items'))

    idMapToArray(this.store.get('groups')).forEach(({ dto: { id } }) => {
      this.createStepUI('group', id)
      this.drawOverlay(id, 'group', sequence, dragState, scale)
    })

    allItems
      .filter(({ dto }) => !dto.groupId)
      .forEach(({ dto: { id } }) => {
        this.createStepUI('item', id)
        this.drawOverlay(id, 'item', sequence, dragState, scale)
      })

    if (dragState) {
      if (!this.draggedStep) {
        const slot = new Graphics({ label: 'dragged-slot', eventMode: 'none', zIndex: 4 })
        const text = this.createText({ zIndex: 5 })
        this.stage.pixi.presentationOrder.stage.addChild(slot, text)
        this.draggedStep = { slot, text }
      }

      this.drawSlot({ slot: this.draggedStep.slot, hovered: false }, this.draggedStep.text, {
        center: dragState.position,
        scale,
        text: `${dragState.stepIndex}`,
        radius: SLOT_RADII.item,
      })
    } else if (this.draggedStep) {
      this.draggedStep.slot.removeFromParent()
      this.draggedStep.text.removeFromParent()
      this.draggedStep = null
    }
  }

  private drawLines() {
    const dragState = this.store.get('presentationOrderState.dragState')
    const sequence = getPresentationSequence(
      mapValues(this.store.get('presentationSteps'), (vm) => vm?.dto),
    )
    const scale = this.computeScale()

    const slotCenters = sequence.map((dto) => this.ui[getPresentedModelId(dto)]!.bounds.center)
    if (dragState) {
      slotCenters[dragState.stepIndex - 1] = dragState.position
    }

    const tangents = this.computeTangents(slotCenters)

    Object.values(this.ui).forEach((ui) => ui?.line.clear())

    sequence.forEach((dto, index) => {
      if (index === 0) return

      const from = slotCenters[index - 1]
      const to = slotCenters[index]
      const curve = computeCurvePoints({
        from: { point: from, direction: tangents[index - 1] },
        to: { point: to, direction: tangents[index] && mul(-1, tangents[index]) },
        controlPointOffsetRange: { min: 30, max: 150 },
        lineWidth: 3,
      })

      const id = dto.type === 'item' ? dto.itemId : dto.groupId
      drawCurve(this.ui[id]!.line, curve).stroke({
        width: 3 * scale,
        color: getPaletteColor('success.100'),
      })
    })
  }

  private removeMissing() {
    const { groups, items } = this.store.get(['groups', 'items'])
    const existing = new Set(...Object.keys(groups), ...Object.keys(items))

    for (const id of Object.keys(this.ui)) {
      if (!existing.has(id)) {
        this.ui[id]?.overlay.removeFromParent()
        this.ui[id]?.slot.removeFromParent()
        this.ui[id]?.text.removeFromParent()
        this.ui[id]?.line.removeFromParent()

        delete this.ui[id]
      }
    }
  }

  private updateViewportTransform() {
    const { translation, scale } = this.store.get('viewport.transform')
    this.stage.pixi.presentationOrder.stage.scale = scale
    this.stage.pixi.presentationOrder.stage.position = { x: translation.dx, y: translation.dy }
  }

  private drawOverlay(
    id: string,
    type: PresentationStepDto['type'],
    sequence: PresentationStepDto[],
    dragState: PresentationOrderState['dragState'],
    scale: number,
  ) {
    const ui = this.ui[id]!
    const presentationIndex = getPresentationIndex(sequence, id)
    const text =
      presentationIndex > 0 && presentationIndex !== dragState?.stepIndex
        ? `${presentationIndex}`
        : ''

    const { position, size, center } = ui.bounds
    const radius = SLOT_RADII[type]
    const isDropTarget = dragState?.dropTarget?.id === id
    const isPartOfPresentation = presentationIndex > 0

    this.drawStepOverlay(ui, {
      position,
      size,
      scale,
      isDropTarget,
      isPartOfPresentation,
    })
    this.drawSlot(ui, ui.text, { center, scale, text, radius })
  }
}
