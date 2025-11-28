import { IconButton, MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons'
import { MenuItemToggle } from 'tapestry-core-client/src/components/lib/buttons/menu-item-toggle'
import { useKeyboardShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-keyboard-shortcuts'
import { MenuItemWithSubmenu } from 'tapestry-core-client/src/components/lib/toolbar'
import { hasRangeSelection } from 'tapestry-core-client/src/lib/dom'
import {
  getBoundingRectangle,
  getSelectionItems,
  resizeItem,
} from 'tapestry-core-client/src/view-model/utils'
import { translate } from 'tapestry-core/src/lib/geometry'
import { duplicateItem } from '../../../model/data/utils'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import {
  addAndPositionItems,
  deleteSelectionItems,
  updateSelectionItems,
} from '../../../pages/tapestry/view-model/store-commands/items'
import { setSnackbar } from '../../../pages/tapestry/view-model/store-commands/tapestry'
import { createItemViewModel } from '../../../pages/tapestry/view-model/utils'
import { DataTransferHandler } from '../../../stage/data-transfer-handler'
import styles from './styles.module.css'

const MORE_SUBMENU_ID = 'more_submenu'
const dataTransferHandler = new DataTransferHandler()

interface UseMoreMenuOptions {
  selectSubmenu: (menu: string, toggle: boolean) => void
  close: () => void
  active: boolean
}

export function useMoreMenu({
  selectSubmenu,
  close,
  active,
}: UseMoreMenuOptions): MenuItemWithSubmenu {
  const dispatch = useDispatch()
  const { items, selection, copiedItemSize } = useTapestryData([
    'items',
    'selection',
    'copiedItemSize',
  ])
  const selectionItems = getSelectionItems({ items, selection }).map(({ dto }) => dto)

  const copyItems = async () => {
    if (hasRangeSelection()) {
      return true
    }
    await dataTransferHandler.serialize(selectionItems)
    dispatch(setSnackbar(`${selectionItems.length} items copied to clipboard`))
  }
  const addDuplicates = () => {
    const viewModels = selectionItems.map((item) => createItemViewModel(duplicateItem(item)))
    const boundingRect = getBoundingRectangle(viewModels)
    const centerAt = translate(boundingRect.center, { dx: 20, dy: 20 })
    dispatch(addAndPositionItems(viewModels, { centerAt, coordinateSystem: 'tapestry' }))
  }
  const pasteSize = () => {
    if (!copiedItemSize) {
      return
    }
    dispatch(
      updateSelectionItems((item) => {
        item.dto.size = resizeItem(item.dto, copiedItemSize)
      }),
    )
    close()
  }
  const deleteSelection = () => dispatch(deleteSelectionItems())

  useKeyboardShortcuts(
    {
      ...(active
        ? {
            'Delete | Backspace': deleteSelection,
            'meta + KeyD | alt + KeyD': addDuplicates,
            'meta + KeyC': copyItems,
            'meta + alt + KeyV': pasteSize,
          }
        : {}),
    },
    [dispatch],
  )

  const dropShadow = selectionItems.every((item) => item.dropShadow)

  return {
    id: MORE_SUBMENU_ID,
    ui: {
      element: (
        <IconButton
          icon="more_horiz"
          aria-label="More"
          onClick={() => selectSubmenu(MORE_SUBMENU_ID, true)}
        />
      ),
      tooltip: { side: 'bottom', children: 'More' },
    },
    direction: 'column',
    submenu: [
      <MenuItemToggle
        onClick={() => {
          dispatch(
            updateSelectionItems((item) => {
              item.dto.dropShadow = !dropShadow
            }),
          )
        }}
        className={styles.menuItemButton}
        isChecked={dropShadow}
      >
        Drop shadow
      </MenuItemToggle>,
      <MenuItemButton shortcut="meta + C" onClick={copyItems} className={styles.menuItemButton}>
        Copy
      </MenuItemButton>,
      <MenuItemButton shortcut="meta + alt + C" disabled className={styles.menuItemButton}>
        Copy Size
      </MenuItemButton>,
      <MenuItemButton
        shortcut="meta + alt + V"
        onClick={pasteSize}
        className={styles.menuItemButton}
        disabled={!copiedItemSize}
      >
        Paste Size
      </MenuItemButton>,
      <MenuItemButton shortcut="meta + D" onClick={addDuplicates} className={styles.menuItemButton}>
        Make a copy
      </MenuItemButton>,
      'separator',
      <MenuItemButton
        shortcut="Delete | Backspace"
        onClick={deleteSelection}
        className={styles.menuItemButton}
        variant="negative"
      >
        Delete
      </MenuItemButton>,
    ],
  }
}
