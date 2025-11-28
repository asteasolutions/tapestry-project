import { selectItem } from '../../../view-model/store-commands/tapestry'
import { focusItems, focusPresentationStep } from '../../../view-model/store-commands/viewport'
import { getAdjacentPresentationSteps, getSelectionItems } from '../../../view-model/utils'
import { useTapestryConfig } from '../../tapestry'
import { FocusButton } from '../../tapestry/focus-button'
import { useFocusElement } from '../../tapestry/hooks/use-focus-element'
import { IconButton } from '../buttons'
import { ShortcutLabel } from '../shortcut-label'
import { MaybeMenuItem, MenuItems } from '../toolbar'
import { useKeyboardShortcuts } from './use-keyboard-shortcuts'

type CommonMenuItem = 'focus' | 'presentation'
export type MultiselectMenuItem = MaybeMenuItem | CommonMenuItem

export function useMultiselectMenu<M extends MultiselectMenuItem[]>(
  menu: M,
  groupId?: string,
): MenuItems {
  const { useStoreData, useDispatch } = useTapestryConfig()

  const { items, selection, presentationSteps } = useStoreData([
    'items',
    'selection',
    'presentationSteps',
  ])
  const dispatch = useDispatch()

  const selectionItems = getSelectionItems({ items, selection }).map(({ dto }) => dto)

  const adjacentPresentationSteps =
    groupId && getAdjacentPresentationSteps(groupId, presentationSteps)

  useKeyboardShortcuts(
    {
      Escape: () => dispatch(selectItem(null)),
    },
    [dispatch],
  )

  const focusElement = useFocusElement()

  return menu.flatMap((menuItem): MaybeMenuItem | MaybeMenuItem[] => {
    if (menuItem === 'focus') {
      return {
        element: (
          <FocusButton
            onFocus={() =>
              groupId
                ? focusElement(groupId)
                : dispatch(
                    focusItems(
                      selectionItems.map((item) => item.id),
                      { addToolbarPadding: true },
                    ),
                  )
            }
          />
        ),
        tooltip: { side: 'bottom', children: <ShortcutLabel text="Focus">F</ShortcutLabel> },
      }
    }

    if (menuItem === 'presentation') {
      return adjacentPresentationSteps
        ? [
            {
              element: (
                <IconButton
                  icon="arrow_back"
                  aria-label="Previous item"
                  disabled={!adjacentPresentationSteps.prev}
                  onClick={() =>
                    dispatch(
                      focusPresentationStep(adjacentPresentationSteps.prev!.dto, {
                        zoomEffect: 'bounce',
                        duration: 1,
                      }),
                    )
                  }
                />
              ),
              tooltip: { side: 'bottom', children: 'Previous item' },
            },
            {
              element: (
                <IconButton
                  icon="arrow_forward"
                  aria-label="Next item"
                  disabled={!adjacentPresentationSteps.next}
                  onClick={() =>
                    dispatch(
                      focusPresentationStep(adjacentPresentationSteps.next!.dto, {
                        zoomEffect: 'bounce',
                        duration: 1,
                      }),
                    )
                  }
                />
              ),
              tooltip: { side: 'bottom', children: 'Next item' },
            },
          ]
        : null
    }

    return menuItem
  })
}
