import { useState } from 'react'
import { IconButton, MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { MenuItemToggle } from 'tapestry-core-client/src/components/lib/buttons/menu-item-toggle'
import { useKeyboardShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-keyboard-shortcuts'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { SubmitOnBlurInput } from 'tapestry-core-client/src/components/lib/submit-on-blur-input/index'
import {
  MaybeMenuItem,
  MenuItem,
  MenuItemWithSubmenu,
  ToolbarElement,
} from 'tapestry-core-client/src/components/lib/toolbar/index'
import {
  CommonMenuItem,
  useItemMenu,
} from 'tapestry-core-client/src/components/tapestry/hooks/use-item-menu'
import { ACTIVE_ITEM_BORDER_WIDTH } from 'tapestry-core-client/src/components/tapestry/items/tapestry-item'
import { hasRangeSelection } from 'tapestry-core-client/src/lib/dom'
import { arrowShortcuts } from 'tapestry-core-client/src/lib/keyboard-event'
import {
  getBoundingRectangle,
  supportsCustomThumbnail,
} from 'tapestry-core-client/src/view-model/utils'
import { Rectangle, translate } from 'tapestry-core/src/lib/geometry'
import { ensureArray, OneOrMore } from 'tapestry-core/src/utils'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { duplicateItem } from '../../../model/data/utils'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import {
  addAndPositionItems,
  copyItemSize,
  deleteItems,
  deleteSelectionItems,
  pasteItemSize,
  removeFromGroup,
  updateItem,
} from '../../../pages/tapestry/view-model/store-commands/items'
import {
  setInteractiveElement,
  setSnackbar,
} from '../../../pages/tapestry/view-model/store-commands/tapestry'
import { createItemViewModel } from '../../../pages/tapestry/view-model/utils'
import { DataTransferHandler } from '../../../stage/data-transfer-handler'
import { CommentButton } from '../../comment-button'
import { CopyLinkButton } from '../copy-link-button'
import { EditorElementToolbar, EditorElementToolbarProps } from '../editor-element-toolbar'
import { ChangeThumbnailButton, ChangeThumbnailDialog } from './change-thumbnail-button'
import styles from './styles.module.css'

const TITLE_SUBMENU_ID = 'title_submenu'
export type TitleSubmenu = typeof TITLE_SUBMENU_ID
const MORE_SUBMENU_ID = 'more_submenu'
export type MoreSubmenu = typeof MORE_SUBMENU_ID

type EditorMenuItem = 'title' | 'ungroup' | 'comment' | 'more-menu' | 'move-handle' | 'share'

export type ItemToolbarMenuItem = CommonMenuItem | EditorMenuItem | MaybeMenuItem
export type ItemToolbarMenu = ItemToolbarMenuItem[]

export type ItemToolbarProps = Omit<
  EditorElementToolbarProps,
  'onFocusOut' | 'selectedSubmenu' | 'isOpen' | 'viewportScale' | 'items' | 'elementBounds'
> & {
  items?: ItemToolbarMenuItem[]
  moreMenuItems?: MenuItem[]
  selectedSubmenu: string | string[]
  onSelectSubmenu: (submenu: string | string[]) => unknown
  tapestryItemId: string
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
  ...props
}: ItemToolbarProps) {
  const dto = useTapestryData(`items.${id}.dto`)!
  const commentThread = useTapestryData(`items.${id}.commentThread`)
  const isEdit = useTapestryData('interactionMode') === 'edit'

  const moreMenu = useEditMoreMenu({
    dto,
    selectedSubmenu,
    onSelectSubmenu,
    moreMenuItems,
    active: isEdit,
  })
  const titleMenu = useTitleMenu({ dto, selectedSubmenu, onSelectSubmenu })
  const ungroupMenu = useUngroupMenu(dto.id)

  const { items: finalItems, ui } = useItemMenu(id, items, (m) => {
    if (m === 'comment') {
      return {
        element: <CommentButton count={commentThread?.size} type="inline-comments" />,
        tooltip: { side: 'bottom', children: 'Comments' },
      }
    }
    if (m === 'more-menu') {
      return moreMenu
    }
    if (m === 'move-handle') {
      return moveHandle
    }
    if (m === 'title') {
      return titleMenu
    }
    if (m === 'ungroup') {
      return ungroupMenu
    }
    return {
      element: <CopyLinkButton id={id} />,
      tooltip: { side: 'bottom', children: 'Get link' },
    }
  })

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
      {ui}
    </>
  )
}

interface TitleMenuOptions {
  dto: ItemDto
  selectedSubmenu: string | string[]
  onSelectSubmenu: (menu: string) => unknown
}

function useTitleMenu({ dto, selectedSubmenu, onSelectSubmenu }: TitleMenuOptions): MenuItem {
  const dispatch = useDispatch()

  const titleSubmenuSelected = selectedSubmenu === TITLE_SUBMENU_ID
  return {
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
          dispatch(updateItem(dto.id, { dto: { title: newTitle } }))
          onSelectSubmenu('')
        }}
        autoFocus
        maxLength={300}
      />,
    ],
  }
}

function useUngroupMenu(id: string): MenuItem {
  const dispatch = useDispatch()

  return {
    element: (
      <IconButton
        icon={{ name: 'stack', fill: true }}
        aria-label="Remove from group"
        onClick={() =>
          dispatch(removeFromGroup(id), setInteractiveElement({ modelId: id, modelType: 'item' }))
        }
      />
    ),
    tooltip: { side: 'bottom', children: 'Remove from group' },
  }
}

interface EditorMoreMenuOptions {
  dto: OneOrMore<ItemDto>
  selectedSubmenu: string | string[]
  onSelectSubmenu: (menu: '' | MoreSubmenu) => unknown
  active: boolean
  moreMenuItems?: MenuItem[]
}

export function useEditMoreMenu({
  dto,
  selectedSubmenu,
  onSelectSubmenu,
  active,
  moreMenuItems = [],
}: EditorMoreMenuOptions): MaybeMenuItem {
  const dispatch = useDispatch()
  const { copiedItemSize } = useTapestryData(['interactionMode', 'copiedItemSize'])

  const [displayThumbnailDialog, setDisplayThumbnailDialog] = useState(false)

  const isMultiselection = Array.isArray(dto)
  const dtoArray = ensureArray(dto)
  const customThumbnail = !isMultiselection && supportsCustomThumbnail(dto)

  const copyItem = async () => {
    if (hasRangeSelection()) {
      return true
    }
    await dataTransferHandler.serialize(dtoArray)
    dispatch(
      setSnackbar(`${isMultiselection ? `${dto.length} items` : 'Item'} copied to clipboard`),
    )
  }
  const copySize = () => {
    if (isMultiselection) {
      return
    }
    dispatch(copyItemSize(dto.size), setSnackbar('Item size copied'))
    onSelectSubmenu('')
  }
  const pasteSize = () => {
    dispatch(pasteItemSize(dto))
    onSelectSubmenu('')
  }
  const addDuplicate = () => {
    const viewModels = dtoArray.map((dto) => createItemViewModel(duplicateItem(dto)))
    const boundingRect = getBoundingRectangle(viewModels)
    const centerAt = translate(boundingRect.center, { dx: 20, dy: 20 })
    dispatch(
      addAndPositionItems(viewModels, { centerAt, coordinateSystem: 'tapestry' }),
      viewModels.length === 1
        ? setInteractiveElement({ modelId: viewModels[0].dto.id, modelType: 'item' })
        : undefined,
    )
  }
  const changeThumbnail = () => {
    setDisplayThumbnailDialog(true)
    onSelectSubmenu('')
  }
  const remove = () => dispatch(isMultiselection ? deleteSelectionItems() : deleteItems(dto.id))

  useKeyboardShortcuts(
    active
      ? {
          'meta + KeyC': copyItem,
          ...(!isMultiselection ? { 'meta + alt + KeyC': copySize } : {}),
          'meta + alt + KeyV': pasteSize,
          'meta + KeyD | alt + KeyD': addDuplicate,
          ...(customThumbnail ? { 'meta + alt + KeyT': changeThumbnail } : {}),
          'Delete | Backspace': remove,
          ...arrowShortcuts((dir, distance) =>
            dispatch(
              ...dtoArray.map(({ id }) =>
                updateItem(id, (item) => {
                  item.dto.position[dir] += distance
                }),
              ),
            ),
          ),
        }
      : {},
    [dispatch],
  )

  const dropShadow = dtoArray.every((item) => item.dropShadow)

  return {
    id: MORE_SUBMENU_ID,
    ui: {
      element: (
        <>
          <IconButton
            icon="more_horiz"
            aria-label="More"
            onClick={() => onSelectSubmenu(MORE_SUBMENU_ID)}
            isActive={selectedSubmenu === MORE_SUBMENU_ID}
          />
          {displayThumbnailDialog && !isMultiselection && (
            <ChangeThumbnailDialog item={dto} onClose={() => setDisplayThumbnailDialog(false)} />
          )}
        </>
      ),
      tooltip: { side: 'bottom', children: 'More' },
    },
    direction: 'column',
    submenu: [
      ...moreMenuItems,
      <MenuItemToggle
        isChecked={dropShadow}
        onClick={() => {
          dispatch(
            ...dtoArray.map(({ id }) => updateItem(id, { dto: { dropShadow: !dropShadow } })),
          )
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
        {...(isMultiselection ? { disabled: true } : { onClick: () => copySize() })}
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
      <MenuItemButton shortcut="meta + D" onClick={addDuplicate} className={styles.menuItemButton}>
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
        onClick={() => remove()}
        className={styles.menuItemButton}
        variant="negative"
      >
        Delete
      </MenuItemButton>,
    ],
  }
}

interface BuildToolbarMenuOptions {
  dto: ItemDto
  isEdit: boolean
  share?: MenuItemWithSubmenu | 'share' | null
  omit?: Partial<Record<'title' | 'share', boolean>>
}

export function buildToolbarMenu({
  dto,
  isEdit,
  share = 'share',
  omit = {},
}: BuildToolbarMenuOptions): ItemToolbarMenuItem[] {
  const commonItems: ItemToolbarMenuItem[] = [
    'comment',
    'separator',
    'focus',
    'separator',
    ...(omit.share ? [] : ([share, 'separator'] as const)),
    'info',
    'separator',
  ]

  return isEdit
    ? [
        ...(omit.title ? [] : (['title', 'separator'] as const)),
        ...(dto.groupId ? (['ungroup', 'separator'] as const) : []),
        ...commonItems,
        'more-menu',
        'separator',
        'prev',
        'next',
        'separator',
        'move-handle',
      ]
    : [...commonItems, 'prev', 'next']
}
