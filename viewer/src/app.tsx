import { enableMapSet, enablePatches } from 'immer'
import 'pixi.js/math-extras'
import { createContext, useRef, useState } from 'react'

import { useResponsiveClass } from 'tapestry-core-client/src/components/lib/hooks/use-responsive-class'
import { useThemeCss } from 'tapestry-core-client/src/components/lib/hooks/use-theme-css'
import {
  TapestryConfigProvider,
  type ProviderConfig,
} from 'tapestry-core-client/src/components/tapestry'
import { useFocusedElement } from 'tapestry-core-client/src/components/tapestry/hooks/use-focus-element'
import { useStageInit } from 'tapestry-core-client/src/components/tapestry/hooks/use-stage-init'
import { TapestryCanvas } from 'tapestry-core-client/src/components/tapestry/tapestry-canvas'
import { ViewportScrollbars } from 'tapestry-core-client/src/components/tapestry/viewport-scrollbars'
import { ZoomToolbar } from 'tapestry-core-client/src/components/tapestry/zoom'
import { Store } from 'tapestry-core-client/src/lib/store'
import { createStoreHooks, createUseStoreHook } from 'tapestry-core-client/src/lib/store/provider'
import type {
  TapestryElementViewModel,
  TapestryViewModel,
} from 'tapestry-core-client/src/view-model'

import { SidePane } from './components/side-pane'
import { TapestryImport } from './components/tapestry-import'
import { TopToolbar } from './components/top-toolbar'
import './index.css'
import { TapestryLifecycleController } from 'tapestry-core-client/src/stage/controller'
import { idMapToArray } from 'tapestry-core/src/utils'
import { TapestryRenderer } from 'tapestry-core-client/src/stage/renderer'
import { ViewportController } from 'tapestry-core-client/src/stage/controller/viewport-controller'
import { ItemController } from 'tapestry-core-client/src/stage/controller/item-controller'
import { GlobalEventsController } from 'tapestry-core-client/src/stage/controller/global-events-controller'
import { useSearchParams } from 'react-router'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { ImportService } from './components/tapestry-import/import-service'
import { LoadingSpinner } from 'tapestry-core-client/src/components/lib/loading-spinner'
import { createPixiApp } from 'tapestry-core-client/src/stage'

enableMapSet()
enablePatches()

const TapestryStoreContext = createContext<Store<TapestryViewModel> | null>(null)

export const {
  useStore: useTapestryStore,
  useStoreData: useTapestryData,
  useDispatch,
} = createStoreHooks(createUseStoreHook(TapestryStoreContext))

const tapestryConfig: ProviderConfig = createStoreHooks(createUseStoreHook(TapestryStoreContext))

function Tapestry() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const pixiContainerRef = useRef<HTMLDivElement>(null)

  const store = useTapestryStore()

  useStageInit(sceneRef, {
    gestureDectorOptions: { scrollGesture: 'pan', dragToPan: store.get('pointerMode') === 'pan' },
    createPixiApps: async () => [
      {
        name: 'tapestry',
        app: await createPixiApp(pixiContainerRef.current!, {
          background: store.get('background'),
        }),
      },
    ],
    lifecycleController: (stage) =>
      new TapestryLifecycleController(store, stage, {
        default: [
          new ViewportController(store, stage),
          new (class extends TapestryRenderer<TapestryElementViewModel> {
            protected getItems() {
              return idMapToArray(this.store.get('items'))
            }
            protected getRels() {
              return idMapToArray(this.store.get('rels'))
            }
          })(store, stage),
        ],
        global: [
          new (class extends ItemController {
            protected tryNavigateToInternalLink() {
              return false
            }
          })(store, stage),
          new GlobalEventsController(store, stage),
        ],
      }),
  })

  useFocusedElement()

  return (
    <div ref={sceneRef} style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div ref={pixiContainerRef} className="pixi-container" />
      <TapestryCanvas classes={{ root: 'dom-container' }} />
      <ViewportScrollbars />
      <TopToolbar />
      <SidePane />
      <ZoomToolbar className="zoom-toolbar" />
    </div>
  )
}

export function App() {
  const [store, setStore] = useState<Store<TapestryViewModel>>()
  const source = useSearchParams()[0].get('source')

  const { loading } = useAsync(
    async ({ signal }) => {
      if (!source) {
        return
      }

      const buffer = await (await fetch(source, { signal })).arrayBuffer()
      const file = new File([buffer], 'tapestry')
      const store = await new ImportService().parse(file)
      if (!store) {
        return
      }
      setStore(store)
    },
    [source],
  )

  useResponsiveClass()
  useThemeCss('light')

  return (
    <TapestryConfigProvider config={tapestryConfig}>
      {store ? (
        <TapestryStoreContext value={store}>
          <Tapestry />
        </TapestryStoreContext>
      ) : loading ? (
        <LoadingSpinner
          size="150px"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ) : (
        <TapestryImport onImport={setStore} />
      )}
    </TapestryConfigProvider>
  )
}
