import { useRef } from 'react'

import { useFocusedElement } from 'tapestry-core-client/src/components/tapestry/hooks/use-focus-element'
import { usePresentationShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-presentation-shortcuts'
import { useStageInit } from 'tapestry-core-client/src/components/tapestry/hooks/use-stage-init'
import { TapestryCanvas } from 'tapestry-core-client/src/components/tapestry/tapestry-canvas'
import { ViewportScrollbars } from 'tapestry-core-client/src/components/tapestry/viewport-scrollbars'
import { ZoomToolbar } from 'tapestry-core-client/src/components/tapestry/zoom'
import type { TapestryElementViewModel } from 'tapestry-core-client/src/view-model'

import { useNavigate } from 'react-router'
import { createPixiApp } from 'tapestry-core-client/src/stage'
import { TapestryLifecycleController } from 'tapestry-core-client/src/stage/controller'
import { GlobalEventsController } from 'tapestry-core-client/src/stage/controller/global-events-controller'
import {
  InternalNavigationState,
  ItemController,
} from 'tapestry-core-client/src/stage/controller/item-controller'
import { ViewportController } from 'tapestry-core-client/src/stage/controller/viewport-controller'
import { ItemThumbnailController } from 'tapestry-core-client/src/stage/controller/item-thumbnail-controller'
import { TapestryRenderer } from 'tapestry-core-client/src/stage/renderer'
import { idMapToArray } from 'tapestry-core/src/utils'
import { useTapestryData, useTapestryStore } from '../../app'
import { SidePane } from '../side-pane'
import { TopToolbar } from '../top-toolbar'

interface TapestryProps {
  onBack: () => unknown
}

export function Tapestry({ onBack }: TapestryProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const pixiContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const store = useTapestryStore()

  const hideControls = useTapestryData('hideControls')

  useStageInit(sceneRef, {
    gestureDetectorOptions: { scrollGesture: 'pan', dragToPan: store.get('pointerMode') === 'pan' },
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
          new ItemThumbnailController(store),
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
            protected tryNavigateToInternalState(
              params: URLSearchParams,
              state: Omit<InternalNavigationState, 'timestamp'>,
            ) {
              const { items, groups } = store.get(['items', 'groups'])
              const focus = params.get('focus')
              const element = focus && (items[focus] ?? groups[focus])
              if (element || focus === 'all') {
                void navigate(
                  { search: params.toString() },
                  {
                    state: { timestamp: Date.now(), ...state } satisfies InternalNavigationState,
                    replace: new URLSearchParams(location.search).get('focus') === focus,
                  },
                )
                return true
              }
              return false
            }
          })(store, stage),
          new GlobalEventsController(store, stage),
        ],
      }),
  })

  useFocusedElement()
  usePresentationShortcuts()

  return (
    <>
      <div ref={sceneRef} className="scene-container">
        <div ref={pixiContainerRef} className="pixi-container" />
        <TapestryCanvas classes={{ root: 'dom-container' }} />
        <ViewportScrollbars />
      </div>
      {!hideControls && <TopToolbar onBack={onBack} />}
      <SidePane />
      <ZoomToolbar className="zoom-toolbar" />
    </>
  )
}
