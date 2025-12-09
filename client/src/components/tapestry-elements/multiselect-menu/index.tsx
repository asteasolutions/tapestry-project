import { useEffect } from 'react'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import {
  MultiselectMenuItem,
  useMultiselectMenu,
} from 'tapestry-core-client/src/components/lib/hooks/use-multiselect-menu'
import { useSingleChoice } from 'tapestry-core-client/src/components/lib/hooks/use-single-choice'
import { getSelectionItems } from 'tapestry-core-client/src/view-model/utils'
import { Rectangle } from 'tapestry-core/src/lib/geometry'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { EditableGroupViewModel } from '../../../pages/tapestry/view-model'
import {
  groupSelection,
  GroupUpdate,
  ungroupSelection,
  updateGroup,
} from '../../../pages/tapestry/view-model/store-commands/groups'
import { clearItemPreviews } from '../../../pages/tapestry/view-model/store-commands/items'
import { CopyLinkButton } from '../copy-link-button'
import { EditorElementToolbar } from '../editor-element-toolbar'
import { MoreSubmenu, moveHandle, useEditMoreMenu } from '../item-toolbar'
import { ColorSubmenu, getGroupMenuItems } from './group-menu-items'
import { GridSubmenu, useGridArrangeButton } from './use-grid-arrange-button'

interface MultiselectMenuProps {
  selectionBounds: Rectangle
  selectedGroup?: EditableGroupViewModel
}

export function MultiselectMenu({ selectionBounds, selectedGroup }: MultiselectMenuProps) {
  const dispatch = useDispatch()
  const isEdit = useTapestryData('interactionMode') === 'edit'

  const { items, selection } = useTapestryData(['items', 'selection'])
  const selectionItems = getSelectionItems({ items, selection }).map(({ dto }) => dto)

  const [selectedSubmenu, selectSubmenu, close] = useSingleChoice<
    GridSubmenu | ColorSubmenu | MoreSubmenu
  >()
  useEffect(() => () => dispatch(clearItemPreviews()), [dispatch])

  const groupId = selectedGroup?.dto.id

  function dispatchUpdate(arg: GroupUpdate['dto']) {
    dispatch(updateGroup(groupId!, { dto: arg }))
  }

  const gridButton = useGridArrangeButton({
    selectedSubmenu,
    selectSubmenu,
  })
  const groupMenus: MultiselectMenuItem[] = groupId
    ? [
        ...getGroupMenuItems(selectedGroup.dto, {
          onGroupColorChange: (color) => dispatchUpdate({ color }),
          onSetHasBackground: (hasBackground) => dispatchUpdate({ hasBackground }),
          onSetHasBorder: (hasBorder) => dispatchUpdate({ hasBorder }),
          selectSubmenu,
          selectedSubmenu,
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
  const moreMenu = useEditMoreMenu({
    dto: selectionItems,
    onSelectSubmenu: selectSubmenu,
    selectedSubmenu,
    active: isEdit,
  })

  const menuItems: MultiselectMenuItem[] = [
    ...(isEdit ? [gridButton, 'separator' as const, ...groupMenus, 'separator' as const] : []),
    'focus',
    !!groupId && {
      element: <CopyLinkButton id={groupId} />,
      tooltip: { side: 'bottom', children: 'Get link' },
    },
    ...(isEdit ? ['separator' as const, moreMenu, 'separator' as const] : []),
    !!groupId && 'presentation',
    isEdit && !!groupId && 'separator',
    isEdit && moveHandle,
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
