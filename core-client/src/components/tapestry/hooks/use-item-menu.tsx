import { shortcutLabel } from '../../../lib/keyboard-event'
import { MaybeMenuItem } from '../../lib/toolbar/index'
import { useKeyboardShortcuts } from '../../lib/hooks/use-keyboard-shortcuts'
import { IconButton } from '../../lib/buttons/index'
import { getAdjacentPresentationSteps } from '../../../view-model/utils'
import { useState } from 'react'
import { useFocusElement } from './use-focus-element'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { FocusButton } from '../focus-button'
import { deselectAll } from '../../../view-model/store-commands/tapestry'
import { useTapestryConfig } from '..'
import { InfoButton } from '../../lib/info-button'
import { focusPresentationStep } from '../../../view-model/store-commands/viewport'
import { ShortcutLabel } from '../../lib/shortcut-label'

const COMMON_MENU_ITEMS = ['focus', 'info', 'prev', 'next'] as const
export type CommonMenuItem = (typeof COMMON_MENU_ITEMS)[number]

export function isCommonMenuItem(str: unknown): str is CommonMenuItem {
  return COMMON_MENU_ITEMS.includes(str as CommonMenuItem)
}

export type ItemMenuItem = MaybeMenuItem | CommonMenuItem

export function useItemMenu<const M extends ItemMenuItem[]>(itemId: Id, menu: M) {
  const { useStoreData, useDispatch, components } = useTapestryConfig()
  const item = useStoreData(`items.${itemId}.dto`)!
  const presentationSteps = useStoreData('presentationSteps')
  const adjacentPresentationSteps = getAdjacentPresentationSteps(itemId, presentationSteps)
  const dispatch = useDispatch()
  const focusElement = useFocusElement()
  const [displayInfo, setDisplayInfo] = useState(false)

  useKeyboardShortcuts(
    {
      ...(menu.includes('info') ? { 'meta + KeyI': showInfo } : {}),
      Escape: () => dispatch(deselectAll()),
    },
    [],
  )

  function showInfo() {
    setDisplayInfo(true)
  }

  return {
    items: menu.map((menuItem): MaybeMenuItem => {
      if (!menuItem) return null

      if (menuItem === 'focus') {
        return {
          element: <FocusButton onFocus={() => focusElement(itemId)} />,
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
        const label = menuItem === 'prev' ? 'Previous item' : 'Next item'
        return {
          element: (
            <IconButton
              icon={menuItem === 'prev' ? 'arrow_back' : 'arrow_forward'}
              aria-label={label}
              disabled={!adjacentPresentationSteps[menuItem]}
              onClick={() =>
                dispatch(
                  focusPresentationStep(adjacentPresentationSteps[menuItem]!.dto, {
                    zoomEffect: 'bounce',
                    duration: 1,
                  }),
                )
              }
            />
          ),
          tooltip: { side: 'bottom', children: label },
        }
      }

      return menuItem
    }),
    ui: displayInfo && (
      <components.ItemInfoModal item={item} onClose={() => setDisplayInfo(false)} />
    ),
  }
}
