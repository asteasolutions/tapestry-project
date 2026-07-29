import { useState } from 'react'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { useTapestryConfig } from '..'
import { shortcutLabel } from '../../../lib/keyboard-event'
import { deselectAll, selectGroups } from '../../../view-model/store-commands/tapestry'
import {
  defaultBounceAnimation,
  focusPresentationStep,
} from '../../../view-model/store-commands/viewport'
import { getAdjacentPresentationSteps } from '../../../view-model/utils'
import { IconButton } from '../../lib/buttons/index'
import { useKeyboardShortcuts } from '../../lib/hooks/use-keyboard-shortcuts'
import { InfoButton } from '../../lib/info-button'
import { ShortcutLabel } from '../../lib/shortcut-label'
import { MaybeMenuItem } from '../../lib/toolbar/index'
import { FocusButton } from '../focus-button'
import { useFocusElement } from './use-focus-element'

const COMMON_MENU_ITEMS = ['focus', 'info', 'prev', 'next', 'deselect'] as const
export type CommonMenuItem = (typeof COMMON_MENU_ITEMS)[number]

export function isCommonMenuItem(str: unknown): str is CommonMenuItem {
  return COMMON_MENU_ITEMS.includes(str as CommonMenuItem)
}

export function useItemMenu<const M extends string>(
  itemId: Id,
  menu: (M | CommonMenuItem | MaybeMenuItem)[],
  menuParser?: (item: M) => MaybeMenuItem,
) {
  const { useStoreData, useDispatch, components } = useTapestryConfig()
  const item = useStoreData(`items.${itemId}.dto`)!
  const presentationSteps = useStoreData('presentationSteps')
  const adjacentPresentationSteps = getAdjacentPresentationSteps(itemId, presentationSteps)
  const dispatch = useDispatch()
  const focusElement = useFocusElement()
  const [displayInfo, setDisplayInfo] = useState(false)

  const continuePresentation = (step: 'next' | 'prev') => {
    if (adjacentPresentationSteps[step]) {
      dispatch(focusPresentationStep(adjacentPresentationSteps[step].dto, defaultBounceAnimation))
    }
  }

  useKeyboardShortcuts({
    ...(menu.includes('info') ? { 'meta + KeyI': showInfo } : {}),
    Escape: () => dispatch(deselectAll()),
  })

  function showInfo() {
    setDisplayInfo(true)
  }

  return {
    items: menu.map((menuItem): MaybeMenuItem => {
      if (!menuItem) return null

      if (menuItem === 'focus') {
        return {
          element: <FocusButton onFocus={() => focusElement(itemId)} />,
          key: 'focus',
          tooltip: { side: 'bottom', children: <ShortcutLabel text="Focus">F</ShortcutLabel> },
        }
      }

      if (menuItem === 'info') {
        return {
          element: <InfoButton variant="icon" onClick={showInfo} active={displayInfo} />,
          tooltip: {
            side: 'bottom',
            children: <ShortcutLabel text="Show info">{shortcutLabel('meta + I')}</ShortcutLabel>,
          },
        }
      }

      if (menuItem === 'prev' || menuItem === 'next') {
        if (!adjacentPresentationSteps.prev && !adjacentPresentationSteps.next) {
          return null
        }

        const presentation = menuItem as 'prev' | 'next'
        const label = presentation === 'prev' ? 'Previous item' : 'Next item'
        return {
          element: (
            <IconButton
              icon={presentation === 'prev' ? 'arrow_back' : 'arrow_forward'}
              aria-label={label}
              disabled={!adjacentPresentationSteps[presentation]}
              onClick={() => continuePresentation(presentation)}
            />
          ),
          tooltip: {
            side: 'bottom',
            children: label,
          },
        }
      }

      if (menuItem === 'deselect') {
        return {
          element: (
            <IconButton
              icon="cancel"
              aria-label="Deselect"
              onClick={() =>
                dispatch(deselectAll(), !!item.groupId && selectGroups([item.groupId]))
              }
            />
          ),
          tooltip: { side: 'bottom', children: <ShortcutLabel text="Deselect">Esc</ShortcutLabel> },
        }
      }

      if (menuItem === 'separator') {
        return 'separator'
      }

      return typeof menuItem === 'string' ? menuParser?.(menuItem) : menuItem
    }),
    ui: displayInfo && (
      <components.ItemInfoModal item={item} onClose={() => setDisplayInfo(false)} />
    ),
  }
}
