import clsx from 'clsx'
import Color from 'color'
import * as PIXI from 'pixi.js'
import 'pixi.js/math-extras'
import { memo, RefObject, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'
import { Snackbar } from 'tapestry-core-client/src/components/lib/snackbar/index'
import { useFocusedElement } from 'tapestry-core-client/src/components/tapestry/hooks/use-focus-element'
import { ViewportScrollbars } from 'tapestry-core-client/src/components/tapestry/viewport-scrollbars'
import { createTapestryStage } from 'tapestry-core-client/src/stage'
import { THEMES } from 'tapestry-core-client/src/theme/themes'
import { CollaboratorCursors } from '../../components/collaborator-cursors'
import { CollaboratorIndicators } from '../../components/collaborator-indicators'
import { DoingWorkIndicator } from '../../components/doing-work-indicator'
import { EditorTitleBar } from '../../components/editor-title-bar'
import { HandleIAImportDialog } from '../../components/handle-ia-import-dialog'
import { LargeFileUploadDialog } from '../../components/large-file-upload-dialog'
import { LeaveTapestryDialog } from '../../components/leave-tapestry-dialog'
import { OfflineIndicator } from '../../components/offline-indicator'
import { QuickTips } from '../../components/quick-tips'
import { SidePane } from '../../components/side-pane'
import { ImportToolbar } from '../../components/toolbars/import'
import { UndoToolbar } from '../../components/toolbars/undo'
import { UserToolbar } from '../../components/toolbars/user'
import { ZoomToolbar } from '../../components/toolbars/zoom'
import { ViewerTitleBar } from '../../components/viewer-title-bar'
import { useTapestryPathParams } from '../../hooks/use-tapestry-path'
import { EditorLifecycleController } from '../../stage/controller'
import { tapestryPath } from '../../utils/paths'
import styles from './styles.module.css'
import { TapestryEditorCanvas } from './tapestry-components'
import {
  useDispatch,
  useTapestryData,
  useTapestryDataSyncCommands,
  useTapestryStore,
} from './tapestry-providers'
import { setInteractionMode, setSnackbar } from './view-model/store-commands/tapestry'
import { ViewportDebugData } from './viewport-debug-data'

function useInteractionModeUrlParam() {
  const { username, slug, edit } = useTapestryPathParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    const isEdit = edit === 'edit'
    dispatch(setInteractionMode(isEdit ? 'edit' : 'view'))
    if (!isEdit) {
      void navigate(tapestryPath(username, slug, 'view', location.search), { replace: true })
    }
  }, [edit, username, slug, dispatch, navigate])
}

async function createPixiApp(container: HTMLDivElement, opts?: Partial<PIXI.ApplicationOptions>) {
  const app = new PIXI.Application()

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

function useStageInit(
  sceneRef: RefObject<HTMLDivElement | null>,
  pixiRef: RefObject<HTMLDivElement | null>,
  presentationOrderRef: RefObject<HTMLDivElement | null>,
) {
  const store = useTapestryStore()

  const tapestryDataSyncCommandsRef = usePropRef(useTapestryDataSyncCommands())

  useAsync(
    async (_abortCtrl, cleanUp) => {
      const scene = sceneRef.current!

      let cancelled = false as boolean
      cleanUp(() => {
        cancelled = true
      })

      const overlay = new Color(THEMES[store.get('theme')].color('overlay'))
      const [tapestryApp, presentationOrderApp] = await Promise.all([
        createPixiApp(pixiRef.current!, { background: store.get('background') }),
        createPixiApp(presentationOrderRef.current!, {
          background: overlay.hex(),
          backgroundAlpha: overlay.alpha(),
        }),
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
        {
          tapestry: tapestryApp,
          presentationOrder: presentationOrderApp,
        },
        {
          scrollGesture: 'pan',
          dragToPan: store.get('pointerMode') === 'pan',
        },
      )

      const lifecycleController = new EditorLifecycleController(
        store,
        stage,
        tapestryDataSyncCommandsRef.current,
      )
      lifecycleController.init()

      cleanUp(() => {
        lifecycleController.dispose()
        tapestryApp.destroy()
        presentationOrderApp.destroy()
      })
    },
    [sceneRef, pixiRef, presentationOrderRef, store, tapestryDataSyncCommandsRef],
  )
}

export function Tapestry() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const pixiContainerRef = useRef<HTMLDivElement>(null)
  const presentationOrderContainerRef = useRef<HTMLDivElement>(null)
  const tapestryTitle = useTapestryData('title')
  const { presentationOrderState, hideEditControls } = useTapestryData([
    'presentationOrderState',
    'hideEditControls',
  ])
  const documentTitle = `Tapestry - ${tapestryTitle}`

  useStageInit(sceneRef, pixiContainerRef, presentationOrderContainerRef)
  useInteractionModeUrlParam()
  useFocusedElement()

  return (
    <div style={{ height: '100%' }}>
      <title>{documentTitle}</title>
      <div className={styles.sceneContainer} ref={sceneRef}>
        <div ref={pixiContainerRef} className="pixi-container" />
        <TapestryEditorCanvas className="dom-container" />
        <div
          ref={presentationOrderContainerRef}
          className={clsx('pixi-container', { [styles.hidden]: !presentationOrderState })}
          inert={!presentationOrderState}
        />
        <div id="item-picker" />
        <ViewportScrollbars />
      </div>
      <QuickTips />
      <div className={styles.mainToolbar}>
        <Toolbars />
      </div>
      <TapestrySnackbar />
      {!hideEditControls && (
        <>
          <div className={styles.usersData}>
            <DoingWorkIndicator />
            <CollaboratorIndicators />
            <UserToolbar />
          </div>
          <CollaboratorCursors />
        </>
      )}
      <SidePane />
      <div className={styles.bottomToolbars}>
        <ViewportDebugData debug={false} />
        <ZoomToolbar />
      </div>
      <OfflineIndicator className={styles.offlineIndicator} />
      <LeaveTapestryDialog />
      <LargeFileUploadDialog />
      <HandleIAImportDialog />
    </div>
  )
}

const Toolbars = memo(function Toolbars() {
  const { interactionMode, presentationOrderState, hideEditControls } = useTapestryData([
    'interactionMode',
    'presentationOrderState',
    'hideEditControls',
  ])

  return (
    <>
      {interactionMode === 'edit' && (
        <>
          <EditorTitleBar />
          <div className={styles.leftToolbar}>
            {!hideEditControls && <ImportToolbar />}
            {/* The "undo" toolbar is only necessary if we are editing the presentation order or the tapestry itself. */}
            {(!hideEditControls || presentationOrderState) && <UndoToolbar />}
          </div>
        </>
      )}
      {interactionMode === 'view' && <ViewerTitleBar />}
    </>
  )
})

function TapestrySnackbar() {
  const snackbarData = useTapestryData('snackbarData')
  const dispatch = useDispatch()
  return <Snackbar value={snackbarData} onChange={() => dispatch(setSnackbar())} />
}
