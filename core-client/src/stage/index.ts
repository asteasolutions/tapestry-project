import { Application, ApplicationOptions } from 'pixi.js'
import { GestureDetector, GestureDetectorOptions } from './gesture-detector'
import { VIEW_MODEL_ANIMATIONS } from '../view-model/tweening'

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
  pixi: Record<'tapestry' | PixiApps, Application>
  gestureDetector: GestureDetector
}

export function createTapestryStage<PixiApps extends string>(
  root: HTMLDivElement,
  pixi: Record<'tapestry' | PixiApps, Application>,
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
  Object.values(stage.pixi).forEach((pixiApp) => {
    pixiApp.stage.hitArea = { contains: () => true }
  })

  stage.pixi.tapestry.ticker.add(() => {
    VIEW_MODEL_ANIMATIONS.update()
  })

  return stage
}

export async function createPixiApp(container: HTMLDivElement, opts?: Partial<ApplicationOptions>) {
  const app = new Application()

  await app.init({
    preference: 'webgl',
    resizeTo: container,
    antialias: true,
    autoDensity: true,
    resolution: 2,
    eventMode: 'static',
    sharedTicker: true,
    ...opts,
  })

  return app
}
