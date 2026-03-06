import { RefObject } from 'react'
import { useAsync } from '../../lib/hooks/use-async'
import { createTapestryStage, PixiAppWrapper, TapestryStage } from '../../../stage'
import { TapestryLifecycleController } from '../../../stage/controller'
import { usePropRef } from '../../lib/hooks/use-prop-ref'
import { TapestryViewModel } from '../../../view-model'
import { GestureDetectorOptions } from '../../../stage/gesture-detector'

type PixiApps<S extends string> =
  | [{ name: 'tapestry'; app: PixiAppWrapper }]
  | [{ name: 'tapestry'; app: PixiAppWrapper }, { name: S; app: PixiAppWrapper }]

export function useStageInit<
  T extends TapestryViewModel,
  M extends Exclude<string, 'default'>,
  S extends string,
>(
  sceneRef: RefObject<HTMLDivElement | null>,
  config: {
    createPixiApps: () => Promise<PixiApps<S>>
    lifecycleController: (stage: TapestryStage<S>) => TapestryLifecycleController<T, M>
    gestureDetectorOptions: GestureDetectorOptions
  },
) {
  const configRef = usePropRef(config)

  useAsync(
    async (_abortCtrl, cleanUp) => {
      const scene = sceneRef.current!
      const { gestureDetectorOptions, lifecycleController, createPixiApps } = configRef.current

      let cancelled = false as boolean
      cleanUp(() => {
        cancelled = true
      })

      const pixiApps = await createPixiApps()

      if (cancelled) {
        pixiApps.forEach(({ app }) => app.destroy())
        return
      }

      const stage = createTapestryStage<S>(
        scene,
        pixiApps.reduce(
          (acc, { app, name }) => ({ ...acc, [name]: app }),
          {} as Record<'tapestry' | S, PixiAppWrapper>,
        ),
        gestureDetectorOptions,
      )

      const controller = lifecycleController(stage)

      controller.init()

      cleanUp(() => {
        controller.dispose()
        pixiApps.forEach(({ app }) => app.destroy())
      })
    },
    [sceneRef, configRef],
  )
}
