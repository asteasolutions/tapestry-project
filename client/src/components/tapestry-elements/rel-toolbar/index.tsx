import clsx from 'clsx'
import { compact, toPairs } from 'lodash'
import { CSSProperties } from 'react'
import { Arrowhead, LineWeight, RelEndpoint } from 'tapestry-core/src/data-format/schemas/rel'
import { useKeyboardShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-keyboard-shortcuts'
import { useSingleChoice } from 'tapestry-core-client/src/components/lib/hooks/use-single-choice'
import { splitInRows } from 'tapestry-core/src/lib/array'
import { shortcutLabel } from 'tapestry-core-client/src/lib/keyboard-event'
import { userSettings } from '../../../services/user-settings'
import { LiteralColor } from 'tapestry-core-client/src/theme/types'
import {
  IconButton,
  ColorButton,
  MenuItemButton,
} from 'tapestry-core-client/src/components/lib/buttons/index'
import { ShortcutLabel } from 'tapestry-core-client/src/components/lib/shortcut-label'
import { MenuItems } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { EditorElementToolbar } from '../editor-element-toolbar'
import { EditableRelViewModel } from '../../../pages/tapestry/view-model'
import styles from './styles.module.css'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { deleteRels, updateRel } from '../../../pages/tapestry/view-model/store-commands/rels'
import { deselectAll } from '../../../pages/tapestry/view-model/store-commands/tapestry'
import { Rectangle } from 'tapestry-core/src/lib/geometry'
import { CommentButton } from '../../comment-button'
import { REL_LINE_WIDTHS } from 'tapestry-core-client/src/view-model/rel-geometry'
import { IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { DOM_CONTAINER_CLASS } from 'tapestry-core-client/src/stage/utils'
import { OPAQUE_COLOR_PRESETS } from 'tapestry-core-client/src/theme'

const REL_COLORS = OPAQUE_COLOR_PRESETS

type Arrowheads = Exclude<`${Arrowhead}-${Arrowhead}`, 'arrow-none'>

const ARROWHEAD_ICONS: Record<Arrowheads, IconName> = {
  'none-none': 'horizontal_rule',
  'none-arrow': 'arrow_right_alt',
  'arrow-arrow': 'arrow_range',
}

interface RelToolbarProps {
  rel: EditableRelViewModel
  relBounds: Rectangle
}

export function RelToolbar({ rel, relBounds }: RelToolbarProps) {
  const [selectedSubmenu, selectSubmenu, close] = useSingleChoice<
    'arrowheads' | 'weight' | 'color'
  >()
  const interactionMode = useTapestryData('interactionMode')
  const dispatch = useDispatch()

  const { dto, commentThread } = rel
  const isEditMode = interactionMode === 'edit'
  const selectedArrowheadsOption = `${dto.from.arrowhead}-${dto.to.arrowhead}` as Arrowheads
  const arrowheadIcon = ARROWHEAD_ICONS[selectedArrowheadsOption]

  function setColor(color: LiteralColor) {
    dispatch(updateRel(dto.id, { dto: { color } }))
    userSettings.update({ relColorCode: color })
    close()
  }

  function setArrowheads(arrowheads: keyof typeof ARROWHEAD_ICONS) {
    const [left, right] = arrowheads.split('-') as RelEndpoint['arrowhead'][]
    dispatch(
      updateRel(dto.id, {
        dto: {
          from: { ...dto.from, arrowhead: left },
          to: { ...dto.to, arrowhead: right },
        },
      }),
    )
    close()
  }

  function setWeight(weight: LineWeight) {
    dispatch(updateRel(dto.id, { dto: { weight } }))
    close()
  }

  useKeyboardShortcuts(
    {
      ...(isEditMode ? { 'Delete | Backspace': () => dispatch(deleteRels(dto.id)) } : {}),
      Escape: () => dispatch(deselectAll()),
    },
    [dispatch, dto.id],
  )

  const menuItems: MenuItems = [
    <CommentButton
      count={commentThread?.size}
      type="inline-comments"
      tooltip={{ side: 'bottom', children: 'Comments' }}
    />,
  ]

  if (isEditMode) {
    menuItems.unshift(
      {
        id: 'arrowheads',
        ui: {
          element: (
            <IconButton
              icon={arrowheadIcon}
              aria-label="Arrowhead"
              onClick={() => selectSubmenu('arrowheads')}
            />
          ),
          tooltip: { side: 'bottom', children: 'Direction' },
        },
        submenu: compact(
          toPairs(ARROWHEAD_ICONS).map(([arrowheads, icon]) => (
            <IconButton
              icon={icon}
              aria-label={arrowheads}
              onClick={() => setArrowheads(arrowheads as keyof typeof ARROWHEAD_ICONS)}
              isActive={arrowheads === selectedArrowheadsOption}
            />
          )),
        ),
      },
      {
        id: 'weight',
        direction: 'column',
        ui: {
          element: (
            <IconButton
              icon="line_weight"
              aria-label="Line weight"
              onClick={() => selectSubmenu('weight')}
            />
          ),
          tooltip: { side: 'bottom', children: 'Weight' },
        },
        submenu: toPairs(REL_LINE_WIDTHS).map(([weight, thickness]) => (
          <MenuItemButton
            className={styles.lineWidthOption}
            style={{ '--line-width': `${thickness}px` } as CSSProperties}
            onClick={() => setWeight(weight as LineWeight)}
          />
        )),
      },
      {
        id: 'color',
        ui: {
          element: (
            <ColorButton
              color={dto.color}
              size={22}
              aria-label="Change color"
              onClick={() => selectSubmenu('color')}
            />
          ),
          tooltip: { side: 'bottom', children: 'Color' },
        },
        submenu: splitInRows(
          (toPairs(REL_COLORS) as [LiteralColor, string][]).map(([color, label]) => (
            <ColorButton
              key={color}
              color={color}
              size={22}
              aria-label={label}
              onClick={() => setColor(color)}
              isSelected={dto.color.toLowerCase() === color.toLowerCase()}
            />
          )),
          3,
        ),
      },
    )

    menuItems.push('separator', {
      element: (
        <IconButton
          style={{ '--icon-color': 'var(--theme-icon-negative)' } as CSSProperties}
          icon="delete"
          aria-label="Delete"
          onClick={() => dispatch(deleteRels(dto.id))}
        />
      ),
      tooltip: {
        side: 'bottom',
        children: (
          <ShortcutLabel text="Remove">{shortcutLabel('Delete | Backspace')}</ShortcutLabel>
        ),
      },
    })
  }

  return (
    <div
      className={clsx(DOM_CONTAINER_CLASS, styles.root)}
      data-component-type="rel"
      data-model-id={dto.id}
    >
      <EditorElementToolbar
        isOpen
        selectedSubmenu={selectedSubmenu}
        onFocusOut={close}
        items={menuItems}
        elementBounds={relBounds}
      />
    </div>
  )
}
