import { useEffect } from 'react'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useKeyboardShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-keyboard-shortcuts'
import {
  MultiselectMenuItem,
  useMultiselectMenu,
} from 'tapestry-core-client/src/components/lib/hooks/use-multiselect-menu'
import { useSingleChoice } from 'tapestry-core-client/src/components/lib/hooks/use-single-choice'
import { SubmenuIds } from 'tapestry-core-client/src/components/lib/toolbar'
import { arrowShortcuts } from 'tapestry-core-client/src/lib/keyboard-event'
import { Rectangle } from 'tapestry-core/src/lib/geometry'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { EditableGroupViewModel } from '../../../pages/tapestry/view-model'
import {
  groupSelection,
  GroupUpdate,
  ungroupSelection,
  updateGroup,
} from '../../../pages/tapestry/view-model/store-commands/groups'
import {
  clearItemPreviews,
  updateSelectionItems,
} from '../../../pages/tapestry/view-model/store-commands/items'
import { CopyLinkButton } from '../copy-link-button'
import { EditorElementToolbar } from '../editor-element-toolbar'
import { moveHandle } from '../item-toolbar'
import { getGroupMenuItems } from './group-menu-items'
import { useGridArrangeButton } from './use-grid-arrange-button'
import { useMoreMenu } from './use-more-menu'

interface MultiselectMenuProps {
  selectionBounds: Rectangle
  selectedGroup?: EditableGroupViewModel
}

export function MultiselectMenu({ selectionBounds, selectedGroup }: MultiselectMenuProps) {
  const dispatch = useDispatch()
  const isEdit = useTapestryData('interactionMode') === 'edit'

  const [selectedSubmenu, selectSubmenu, close] = useSingleChoice<SubmenuIds<typeof menuItems>>()

  useKeyboardShortcuts(
    {
      ...(isEdit
        ? {
            ...arrowShortcuts((dir, distance) => {
              dispatch(
                updateSelectionItems((item) => {
                  item.dto.position[dir] += distance
                }),
              )
            }),
          }
        : {}),
    },
    [dispatch],
  )

  useEffect(() => () => dispatch(clearItemPreviews()), [dispatch])

  const groupId = selectedGroup?.dto.id

  function dispatchUpdate(arg: GroupUpdate['dto']) {
    dispatch(updateGroup(groupId!, { dto: arg }))
  }

  const gridButton = useGridArrangeButton({ selectedSubmenu, selectSubmenu })
  const groupMenus: MultiselectMenuItem[] = groupId
    ? [
        ...getGroupMenuItems(selectedGroup.dto, {
          onGroupColorChange: (color) => dispatchUpdate({ color }),
          onSetHasBackground: (hasBackground) => dispatchUpdate({ hasBackground }),
          onSetHasBorder: (hasBorder) => dispatchUpdate({ hasBorder }),
          selectSubmenu: (submenu) => selectSubmenu(submenu, true),
          onUngroupSelection: () => dispatch(ungroupSelection()),
        }),
      ]
    : [
        {
          element: (
            <IconButton
              icon="stack_group"
              aria-label="Group"
              onClick={() => dispatch(groupSelection())}
            />
          ),
          tooltip: { side: 'bottom', children: 'Group' },
        },
      ]
  const moreMenu = useMoreMenu({ selectSubmenu, close, active: isEdit })

  const menuItems: MultiselectMenuItem[] = [
    ...(isEdit ? [gridButton, 'separator' as const, ...groupMenus, 'separator' as const] : []),
    'focus',
    !!groupId && {
      element: <CopyLinkButton id={groupId} />,
      tooltip: { side: 'bottom', children: 'Get link' },
    },
    (isEdit || !!groupId) && 'separator',
    isEdit && moreMenu,
    !!groupId && 'presentation',
    ...(isEdit ? ['separator' as const, moveHandle] : []),
  ]

  const toolbarItems = useMultiselectMenu(menuItems, groupId)

  return (
    <EditorElementToolbar
      elementBounds={selectionBounds}
      selectedSubmenu={selectedSubmenu}
      items={toolbarItems}
      onFocusOut={() => close()}
      isOpen
    />
  )
}
