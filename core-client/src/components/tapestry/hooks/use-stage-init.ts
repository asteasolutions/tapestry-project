import { RefObject } from 'react'
import { useAsync } from '../../lib/hooks/use-async'
import { createPixiApp, createTapestryStage, TapestryStage } from '../../../stage'
import { TapestryLifecycleController } from '../../../stage/controller'
import { ApplicationOptions } from 'pixi.js'
import { usePropRef } from '../../lib/hooks/use-prop-ref'
import { TapestryViewModel } from '../../../view-model'
import { GestureDetectorOptions } from '../../../stage/gesture-detector'

export function useStageInit<T extends TapestryViewModel, M extends Exclude<string, 'default'>>(
  sceneRef: RefObject<HTMLDivElement | null>,
  pixiRef: RefObject<HTMLDivElement | null>,
  presentationOrderRef: RefObject<HTMLDivElement | null>,
  config: {
    tapestryPixiOptions: Partial<ApplicationOptions>
    presentationPixiOptions: Partial<ApplicationOptions>
    lifecycleController: (
      stage: TapestryStage<'presentationOrder'>,
    ) => TapestryLifecycleController<T, M>
    gestureDectorOptions: GestureDetectorOptions
  },
) {
  const configRef = usePropRef(config)

  useAsync(
    async (_abortCtrl, cleanUp) => {
      const scene = sceneRef.current!

      let cancelled = false as boolean
      cleanUp(() => {
        cancelled = true
      })

      const [tapestryApp, presentationOrderApp] = await Promise.all([
        createPixiApp(pixiRef.current!, configRef.current.tapestryPixiOptions),
        createPixiApp(presentationOrderRef.current!, configRef.current.presentationPixiOptions),
      ])

      if (cancelled) {
        tapestryApp.destroy()
        presentationOrderApp.destroy()
        return
      }

      pixiRef.current!.appendChild(tapestryApp.canvas)
      presentationOrderRef.current!.appendChild(presentationOrderApp.canvas)

      const stage = createTapestryStage<'presentationOrder'>(
        scene,
        { tapestry: tapestryApp, presentationOrder: presentationOrderApp },
        configRef.current.gestureDectorOptions,
      )

      const lifecycleController = configRef.current.lifecycleController(stage)

      lifecycleController.init()

      cleanUp(() => {
        lifecycleController.dispose()
        tapestryApp.destroy()
        presentationOrderApp.destroy()
      })
    },
    [sceneRef, pixiRef, presentationOrderRef, configRef],
  )
}
