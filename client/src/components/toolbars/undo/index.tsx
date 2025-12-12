import { isEmpty } from 'lodash-es'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useKeyboardShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-keyboard-shortcuts'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { ShortcutLabel } from 'tapestry-core-client/src/components/lib/shortcut-label'
import { Toolbar } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { useViewportObstruction } from 'tapestry-core-client/src/components/tapestry/hooks/use-viewport-obstruction'
import { shortcutLabel } from 'tapestry-core-client/src/lib/keyboard-event'
import { useTapestryData, useTapestryStore } from '../../../pages/tapestry/tapestry-providers'
import { deletePresentationSteps } from '../../../pages/tapestry/view-model/store-commands/presentation-steps'

interface GlobalMenuProps {
  className?: string
}

export function UndoToolbar({ className }: GlobalMenuProps) {
  const obstruction = useViewportObstruction({ clear: { top: true, bottom: true, left: true } })
  const store = useTapestryStore()
  const undoState = useObservable(store.undoStack)
  const { presentationOrderState, presentationSteps, interactionMode } = useTapestryData([
    'presentationOrderState',
    'presentationSteps',
    'interactionMode',
  ])

  useKeyboardShortcuts(
    interactionMode === 'edit'
      ? {
          'meta + shift + KeyZ | meta + KeyY': () => store.undoStack.redo(),
          'meta + KeyZ': () => store.undoStack.undo(),
        }
      : {},
    [interactionMode, store],
  )

  return (
    <Toolbar
      wrapperRef={obstruction.ref}
      isOpen
      className={className}
      items={[
        {
          element: (
            <IconButton
              icon="undo"
              aria-label="Undo"
              onClick={() => store.undoStack.undo()}
              disabled={!undoState.canUndo}
            />
          ),
          tooltip: {
            side: 'right',
            children: <ShortcutLabel text="Undo">{shortcutLabel('meta + Z')}</ShortcutLabel>,
          },
        },
        {
          element: (
            <IconButton
              icon="redo"
              aria-label="Redo"
              onClick={() => store.undoStack.redo()}
              disabled={!undoState.canRedo}
            />
          ),
          tooltip: {
            side: 'right',
            children: (
              <ShortcutLabel text="Redo">
                {shortcutLabel('meta + shift + Z | meta + Y')}
              </ShortcutLabel>
            ),
          },
        },
        !!presentationOrderState && 'separator',
        !!presentationOrderState && {
          element: (
            <IconButton
              icon="refresh"
              aria-label="Clear presentation"
              onClick={() =>
                store.dispatch(deletePresentationSteps(Object.keys(presentationSteps)))
              }
              disabled={isEmpty(presentationSteps)}
            />
          ),
          tooltip: { side: 'right', children: 'Clear presentation' },
        },
      ]}
      direction="column"
    />
  )
}
