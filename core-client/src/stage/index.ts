import { Application, ApplicationOptions } from 'pixi.js'
import { GestureDetector, GestureDetectorOptions } from './gesture-detector'
import { Animations, AnimationsState, VIEW_MODEL_ANIMATIONS } from '../view-model/tweening'
import { ChangeEvent } from '../lib/events/observable'

export class PixiAppWrapper {
  private rafId?: number
  readonly animations = new Set<Animations>()

  constructor(readonly app: Application) {}

  addAnimations(animations: Animations) {
    if (this.animations.has(animations)) return

    this.animations.add(animations)
    animations.addEventListener('change', this.onAnimationStateChange)
  }

  removeAnimations(animations: Animations) {
    if (!this.animations.has(animations)) return

    this.animations.delete(animations)
    animations.removeEventListener('change', this.onAnimationStateChange)
  }

  scheduleRedraw() {
    this.rafId ??= requestAnimationFrame(this.drawFrame)
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = undefined
    }

    this.app.stage.removeChildren().forEach((c) => c.destroy({ children: true }))
    this.app.destroy(true, true)
  }

  private onAnimationStateChange = (event: ChangeEvent<AnimationsState>) => {
    if (!event.detail.value.allStopped) this.scheduleRedraw()
  }

  private drawFrame = () => {
    this.rafId = undefined

    const liveAnimations: Animations[] = []
    for (const animations of this.animations) {
      if (!animations.group.allStopped()) {
        liveAnimations.push(animations)
      }
    }
    liveAnimations.forEach(({ group }) => group.update())

    this.app.renderer.render(this.app.stage)

    if (liveAnimations.length > 0) this.scheduleRedraw()
  }
}

/**
 * The "Tapestry Stage" describes the basic structure of DOM containers used to visualize a Tapestry. Typically it
 * consists of a top-level DOM element, a.k.a. "the Stage root". Inside the Stage root there is another container in
 * which free-style drawings, such as arrows, are drawn using Pixi.js. In addition to the Pixi container, the Stage root
 * also contains all DOM elements associated with Tapestry items, all of them possibly wrapped in another container. The
 * overall DOM structure of the Tapestry Stage should look something like this:
 *
 * ```html
 * <div className="stage-root">
 *   <div className="pixi-container">
 *     <!-- Pixi canvas lives here -->
 *   </div>
 *   <div className="dom-container">
 *     <!-- Item-specific DOM nodes -->
 *   </div>
 * </div>
 * ```
 */
export interface TapestryStage<PixiApps extends string = never> {
  root: HTMLDivElement
  pixi: Record<'tapestry' | PixiApps, PixiAppWrapper>
  gestureDetector: GestureDetector
}

export function createTapestryStage<PixiApps extends string>(
  root: HTMLDivElement,
  pixi: Record<'tapestry' | PixiApps, PixiAppWrapper>,
  gestureDetectorOptions: GestureDetectorOptions,
): TapestryStage<PixiApps> {
  // We have a chicken-and-egg problem here. We can't create the GestureDetector without a TapestryStage, but we
  // also can't create a TapestryStage without a GestureDetector due to type checks. Hence, the ugly type cast.
  // I promise GestureDetector doesn't use `stage.gestureDetector` in its constructor.
  const stage = { root, pixi } as TapestryStage<PixiApps>
  stage.gestureDetector = new GestureDetector(stage, gestureDetectorOptions)

  // Configure the top-level Pixi container (the "stage") to have the whole plane as a hit area
  // so that we can capture mouse events anywhere in it. Pixi's default behavior is to capture
  // mouse events only on child containers that have actual visual content.
  Object.values(stage.pixi).forEach(({ app }) => {
    app.stage.hitArea = { contains: () => true }
  })

  stage.pixi.tapestry.addAnimations(VIEW_MODEL_ANIMATIONS)

  return stage
}

export async function createPixiApp(
  container: HTMLElement,
  opts?: Partial<Omit<ApplicationOptions, 'canvas'>>,
) {
  const app = new Application()

  await app.init({
    preference: 'webgl',
    resizeTo: container,
    antialias: true,
    autoDensity: true,
    resolution: 2,
    roundPixels: true,
    eventMode: 'passive',
    // Don't use a ticker, render on demand
    autoStart: false,
    sharedTicker: false,
    ...opts,
  })

  container.appendChild(app.canvas)

  return new PixiAppWrapper(app)
}
