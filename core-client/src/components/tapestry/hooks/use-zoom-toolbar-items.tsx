import { MaybeMenuItem, SubmenuIds } from '../../lib/toolbar/index'
import { useKeyboardShortcuts } from '../../lib/hooks/use-keyboard-shortcuts'
import { IconButton, MenuItemButton } from '../../lib/buttons/index'
import { getMinScale, isMultiselection } from '../../../view-model/utils'
import { useFocusElement } from './use-focus-element'
import { setSidePane } from '../../../view-model/store-commands/tapestry'
import { useTapestryConfig } from '..'
import { focusPresentationStep, zoomIn, zoomOut } from '../../../view-model/store-commands/viewport'
import { ShortcutLabel } from '../../lib/shortcut-label'
import { idMapToArray } from 'tapestry-core/src/utils'
import { MAX_SCALE } from '../../../view-model'
import { useSingleChoice } from '../../lib/hooks/use-single-choice'
import { FullscreenButton } from '../zoom/fullscreen-button'

type CommonMenuItem = 'zoom-out' | 'zoom-in' | 'zoom-to-fit'
type MoreMenuCommonItem = 'guide' | 'shortcuts' | 'start-presentation' | 'fullscreen'

export type MainMenuItem = MaybeMenuItem | CommonMenuItem
export type MoreMenuItem = MaybeMenuItem | MoreMenuCommonItem

interface UseZoomToolbarItemsResult {
  items: MaybeMenuItem[]
  closeSubmenu: () => void
  selectedSubmenu: string
}

export function useZoomToolbarItems<
  const M extends MainMenuItem[],
  const MM extends MoreMenuItem[],
>(menu: M, moreMenu: MM): UseZoomToolbarItemsResult {
  const { useStoreData, useDispatch, useStore } = useTapestryConfig()

  const { viewport, items, presentationSteps } = useStoreData([
    'viewport',
    'items',
    'presentationSteps',
  ])
  const scale = useStoreData('viewport.transform.scale')
  const dispatch = useDispatch()
  const minScale = getMinScale(viewport, idMapToArray(items))

  const firstPresentationStep = idMapToArray(presentationSteps).find((step) => !step.dto.prevStepId)

  const hasItems = Object.keys(items).length !== 0

  const focusElement = useFocusElement()

  const store = useStore()
  useKeyboardShortcuts(
    {
      ...(menu.includes('zoom-out') ? { Minus: (e) => store.dispatch(zoomOut(e.repeat)) } : {}),
      ...(menu.includes('zoom-in') ? { Equal: (e) => store.dispatch(zoomIn(e.repeat)) } : {}),
      ...(menu.includes('zoom-to-fit')
        ? {
            KeyF: () => {
              // Do not call this handler if there is an active element, since its focus button should be triggered.
              // TODO: Find a better way to handle this (perhaps using the capture phase only in the item's toolbar)
              if (
                store.get('interactiveElement') ||
                isMultiselection(store.get('selection')) ||
                !hasItems
              ) {
                return
              }

              focusElement('all')
            },
          }
        : {}),
    },
    [],
  )

  const [selectedSubmenu, selectSubmenu, closeSubmenu] =
    useSingleChoice<SubmenuIds<typeof toolbarItems>>()

  const moreMenuItem: MaybeMenuItem[] =
    moreMenu.length === 0
      ? []
      : [
          'separator',
          {
            id: 'more',
            ui: {
              element: (
                <IconButton
                  icon="more_vert"
                  aria-label="More actions"
                  onClick={() => selectSubmenu('more', true)}
                  isActive={selectedSubmenu.startsWith('more')}
                />
              ),
              tooltip: {
                side: 'top',
                children: 'Tapestry controls',
                align: 'end',
                arrowFollowsAlignment: true,
              },
            },
            direction: 'column',
            submenu: moreMenu.flatMap((menu) => {
              if (menu === 'guide') {
                return (
                  <MenuItemButton
                    icon="menu_book"
                    onClick={() => {
                      dispatch(setSidePane('guide'))
                      closeSubmenu()
                    }}
                  >
                    Getting started guide
                  </MenuItemButton>
                )
              }

              if (menu === 'shortcuts') {
                return (
                  <MenuItemButton
                    icon="keyboard"
                    onClick={() => {
                      dispatch(setSidePane('shortcuts'))
                      closeSubmenu()
                    }}
                  >
                    Keyboard shortcuts
                  </MenuItemButton>
                )
              }

              if (menu === 'start-presentation') {
                return (
                  <MenuItemButton
                    icon="smart_display"
                    aria-label="Start presentation"
                    disabled={!firstPresentationStep}
                    onClick={() => {
                      dispatch(focusPresentationStep(firstPresentationStep!.dto))
                      closeSubmenu()
                    }}
                  >
                    Start Presentation
                  </MenuItemButton>
                )
              }

              if (menu === 'fullscreen') {
                return document.fullscreenEnabled
                  ? (['separator', <FullscreenButton onClick={() => closeSubmenu()} />] as const)
                  : []
              }
              return menu
            }),
          },
        ]

  const toolbarItems: MaybeMenuItem[] = [
    ...menu.map((menuItem): MaybeMenuItem => {
      if (!menuItem) return null

      if (menuItem === 'zoom-out') {
        return {
          element: (
            <IconButton
              icon="remove"
              aria-label="Zoom out"
              onClick={() => dispatch(zoomOut())}
              onRepeatClick={() => dispatch(zoomOut(true))}
              disabled={!!viewport.isZoomingLocked || scale <= minScale}
            />
          ),
          tooltip: { side: 'top', children: <ShortcutLabel text="Zoom out">-</ShortcutLabel> },
        }
      }

      if (menuItem === 'zoom-in') {
        return {
          element: (
            <IconButton
              icon="add"
              aria-label="Zoom in"
              onClick={() => dispatch(zoomIn())}
              onRepeatClick={() => dispatch(zoomIn(true))}
              disabled={!!viewport.isZoomingLocked || scale === MAX_SCALE}
            />
          ),
          tooltip: { side: 'top', children: <ShortcutLabel text="Zoom in">+</ShortcutLabel> },
        }
      }

      if (menuItem === 'zoom-to-fit') {
        return {
          element: (
            <IconButton
              icon="arrows_input"
              aria-label="Focus all"
              onClick={() => focusElement('all')}
              disabled={!hasItems}
            />
          ),
          tooltip: { side: 'top', children: <ShortcutLabel text="Zoom to fit">F</ShortcutLabel> },
        }
      }

      return menuItem
    }),
    ...moreMenuItem,
  ]

  return { items: toolbarItems, closeSubmenu, selectedSubmenu }
}
