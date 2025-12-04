import { RefObject } from 'react'
import { useAsync } from '../../lib/hooks/use-async'
import { createTapestryStage, TapestryStage } from '../../../stage'
import { TapestryLifecycleController } from '../../../stage/controller'
import { Application } from 'pixi.js'
import { usePropRef } from '../../lib/hooks/use-prop-ref'
import { TapestryViewModel } from '../../../view-model'
import { GestureDetectorOptions } from '../../../stage/gesture-detector'

export function useStageInit<
  T extends TapestryViewModel,
  M extends Exclude<string, 'default'>,
  S extends string,
>(
  sceneRef: RefObject<HTMLDivElement | null>,
  config: {
    createPixiApps: () => Promise<
      | [{ name: 'tapestry'; app: Application }]
      | [{ name: 'tapestry'; app: Application }, { name: S; app: Application }]
    >
    lifecycleController: (stage: TapestryStage<S>) => TapestryLifecycleController<T, M>
    gestureDectorOptions: GestureDetectorOptions
  },
) {
  const configRef = usePropRef(config)

  useAsync(
    async (_abortCtrl, cleanUp) => {
      const scene = sceneRef.current!
      const { gestureDectorOptions, lifecycleController, createPixiApps } = configRef.current

      let cancelled = false as boolean
      cleanUp(() => {
        cancelled = true
      })

      const pixiApps = await createPixiApps()

      if (cancelled) {
        pixiApps.forEach(({ app }) => app.destroy(true, true))
        return
      }

      const stage = createTapestryStage<S>(
        scene,
        pixiApps.reduce(
          (acc, { app, name }) => ({ ...acc, [name]: app }),
          {} as Record<'tapestry' | S, Application>,
        ),
        gestureDectorOptions,
      )

      const controller = lifecycleController(stage)

      controller.init()

      cleanUp(() => {
        controller.dispose()
        pixiApps.forEach(({ app }) => app.destroy(true, true))
      })
    },
    [sceneRef, configRef],
  )
}
