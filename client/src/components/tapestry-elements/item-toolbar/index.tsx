import { arrowShortcuts } from 'tapestry-core-client/src/lib/keyboard-event'
import {
  ToolbarElement,
  isMultiLineMenu,
  MenuItem,
  MenuItems,
} from 'tapestry-core-client/src/components/lib/toolbar/index'
import { EditorElementToolbar, EditorElementToolbarProps } from '../editor-element-toolbar'
import { useKeyboardShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-keyboard-shortcuts'
import styles from './styles.module.css'
import { IconButton, MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { duplicateItem } from '../../../model/data/utils'
import { DataTransferHandler } from '../../../stage/data-transfer-handler'
import { MenuItemToggle } from 'tapestry-core-client/src/components/lib/buttons/menu-item-toggle'
import { SubmitOnBlurInput } from 'tapestry-core-client/src/components/lib/submit-on-blur-input/index'
import { createItemViewModel } from '../../../pages/tapestry/view-model/utils'
import { useState } from 'react'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import {
  addAndPositionItems,
  copyItemSize,
  deleteItems,
  pasteItemSize,
  removeFromGroup,
  updateItem,
} from '../../../pages/tapestry/view-model/store-commands/items'
import {
  setInteractiveElement,
  setSnackbar,
} from '../../../pages/tapestry/view-model/store-commands/tapestry'
import { Rectangle, translate } from 'tapestry-core/src/lib/geometry'
import { ACTIVE_ITEM_BORDER_WIDTH } from 'tapestry-core-client/src/components/tapestry/items/tapestry-item'
import { hasRangeSelection } from 'tapestry-core-client/src/lib/dom'
import { CommentButton } from '../../comment-button'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { ChangeThumbnailButton, ChangeThumbnailDialog } from './change-thumbnail-button'
import { useShareMenu } from './use-share-menu'
import {
  ItemMenuItem,
  useItemMenu,
} from 'tapestry-core-client/src/components/tapestry/hooks/use-item-menu'
import { supportsCustomThumbnail } from 'tapestry-core-client/src/view-model/utils'

const TITLE_SUBMENU_ID = 'title_submenu'
const MORE_SUBMENU_ID = 'more_submenu'

export type ItemToolbarProps = Omit<
  EditorElementToolbarProps,
  'onFocusOut' | 'selectedSubmenu' | 'isOpen' | 'viewportScale' | 'items' | 'elementBounds'
> & {
  items?: MenuItems
  moreMenuItems?: MenuItem[]
  selectedSubmenu: string | string[]
  onSelectSubmenu: (submenu: string | string[]) => unknown
  hasTitle?: boolean
  tapestryItemId: string
  hideCommon?: boolean
}

const dataTransferHandler = new DataTransferHandler()

export const moveHandle: ToolbarElement = {
  element: <Icon icon="drag_pan" className={styles.moveArrow} data-ui-component="dragHandle" />,
  tooltip: { side: 'bottom', children: 'Move' },
}

export function ItemToolbar({
  items = [],
  moreMenuItems = [],
  selectedSubmenu,
  onSelectSubmenu,
  tapestryItemId: id,
  hasTitle = true,
  hideCommon,
  ...props
}: ItemToolbarProps) {
  const [displayThumbnailDialog, setDisplayThumbnailDialog] = useState(false)
  const titleSubmenuSelected = selectedSubmenu === TITLE_SUBMENU_ID

  const { interactionMode, copiedItemSize } = useTapestryData(['interactionMode', 'copiedItemSize'])

  const dto = useTapestryData(`items.${id}.dto`)!
  const commentThread = useTapestryData(`items.${id}.commentThread`)
  const dispatch = useDispatch()

  const addDuplicate = () => {
    const viewModel = createItemViewModel(duplicateItem(dto))
    const boundingRect = new Rectangle(viewModel.dto)
    const centerAt = translate(boundingRect.center, { dx: 20, dy: 20 })
    dispatch(
      addAndPositionItems(viewModel, { centerAt, coordinateSystem: 'tapestry' }),
      setInteractiveElement({ modelId: viewModel.dto.id, modelType: 'item' }),
    )
  }

  const copyItem = async () => {
    if (hasRangeSelection()) {
      return true
    }
    await dataTransferHandler.serialize([dto])
    dispatch(setSnackbar('Item copied to clipboard'))
  }

  const copySize = () => {
    dispatch(copyItemSize(dto.size), setSnackbar('Item size copied'))
    onSelectSubmenu('')
  }

  const pasteSize = () => {
    dispatch(pasteItemSize(id))
    onSelectSubmenu('')
  }

  const changeThumbnail = () => {
    setDisplayThumbnailDialog(true)
    onSelectSubmenu('')
  }

  const isEditMode = interactionMode === 'edit'

  const customThumbnail = supportsCustomThumbnail(dto)

  useKeyboardShortcuts(
    isEditMode
      ? {
          'Delete | Backspace': () => dispatch(deleteItems(id)),
          'meta + KeyD | alt + KeyD': addDuplicate,
          'meta + KeyC': copyItem,
          'meta + alt + KeyC': copySize,
          'meta + alt + KeyV': pasteSize,
          ...(customThumbnail ? { 'meta + alt + KeyT': changeThumbnail } : {}),
          ...arrowShortcuts((dir, distance) =>
            dispatch(
              updateItem(id, (item) => {
                item.dto.position[dir] += distance
              }),
            ),
          ),
        }
      : {},
    [dispatch, id],
  )

  const commonItems: ItemMenuItem[] = []
  if (isEditMode && hasTitle) {
    commonItems.push(
      {
        id: TITLE_SUBMENU_ID,
        ui: {
          element: (
            <IconButton
              icon="edit_square"
              aria-label="Edit Title"
              onClick={() => onSelectSubmenu(TITLE_SUBMENU_ID)}
              isActive={titleSubmenuSelected}
            />
          ),
          tooltip: { side: 'bottom', children: 'Add title' },
        },
        submenu: [
          <SubmitOnBlurInput
            value={dto.title ?? ''}
            onSubmit={(newTitle) => {
              if (newTitle === dto.title) {
                return
              }
              dispatch(updateItem(id, { dto: { title: newTitle } }))
              onSelectSubmenu('')
            }}
            autoFocus
            maxLength={300}
          />,
        ],
      } as MenuItem,
      'separator',
    )
  }

  const shareMenu = useShareMenu(dto, onSelectSubmenu)

  if (isEditMode && dto.groupId) {
    commonItems.push(
      {
        element: (
          <IconButton
            icon={{ name: 'stack', fill: true }}
            aria-label="Remove from group"
            onClick={() => {
              dispatch(
                removeFromGroup(dto.id),
                setInteractiveElement({ modelId: dto.id, modelType: 'item' }),
              )
            }}
          />
        ),
        tooltip: { side: 'bottom', children: 'Remove from group' },
      },
      'separator',
    )
  }

  commonItems.push(
    {
      element: <CommentButton count={commentThread?.size} type="inline-comments" />,
      tooltip: { side: 'bottom', children: 'Comments' },
    },
    'separator',
    'focus',
    'separator',
    shareMenu,
    'separator',
    'info',
  )

  if (isEditMode) {
    commonItems.push(
      'separator',
      {
        id: MORE_SUBMENU_ID,
        ui: {
          element: (
            <IconButton
              icon="more_horiz"
              aria-label="More"
              onClick={() => onSelectSubmenu(MORE_SUBMENU_ID)}
            />
          ),
          tooltip: { side: 'bottom', children: 'More' },
        },
        direction: 'column',
        submenu: [
          ...moreMenuItems,
          <MenuItemToggle
            isChecked={dto.dropShadow}
            onClick={() => {
              dispatch(updateItem(id, { dto: { dropShadow: !dto.dropShadow } }))
            }}
            className={styles.menuItemButton}
          >
            Drop shadow
          </MenuItemToggle>,
          <MenuItemButton shortcut="meta + C" onClick={copyItem} className={styles.menuItemButton}>
            Copy
          </MenuItemButton>,
          <MenuItemButton
            shortcut="meta + alt + C"
            onClick={copySize}
            className={styles.menuItemButton}
          >
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
          <MenuItemButton
            shortcut="meta + D"
            onClick={addDuplicate}
            className={styles.menuItemButton}
          >
            Make a copy
          </MenuItemButton>,
          ...(customThumbnail
            ? ([
                'separator',
                <ChangeThumbnailButton
                  className={styles.menuItemButton}
                  onClick={() => changeThumbnail()}
                />,
              ] as const)
            : []),
          'separator',
          <MenuItemButton
            shortcut="Delete | Backspace"
            onClick={() => dispatch(deleteItems(id))}
            className={styles.menuItemButton}
            variant="negative"
          >
            Delete
          </MenuItemButton>,
        ],
      },
      'separator',
      'prev',
      'next',
      'separator',
      moveHandle,
    )
  } else {
    commonItems.push('separator', 'prev', 'next')
  }

  const menu = useItemMenu(id, commonItems)
  let finalItems: MenuItems
  if (hideCommon) {
    finalItems = items
  } else if (isMultiLineMenu(items)) {
    finalItems = [...items, menu.items]
  } else {
    if (items.length > 0) {
      finalItems = [...items, 'separator', ...menu.items]
    } else {
      finalItems = [...menu.items]
    }
  }

  return (
    <>
      <EditorElementToolbar
        isOpen
        items={finalItems}
        onFocusOut={() => onSelectSubmenu('')}
        selectedSubmenu={selectedSubmenu}
        style={{ cursor: 'auto' }}
        elementBounds={new Rectangle(dto).expand(ACTIVE_ITEM_BORDER_WIDTH)}
        {...props}
      />
      {menu.ui}
      {displayThumbnailDialog && (
        <ChangeThumbnailDialog item={dto} onClose={() => setDisplayThumbnailDialog(false)} />
      )}
    </>
  )
}
