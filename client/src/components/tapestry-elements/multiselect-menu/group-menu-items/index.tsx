import { GroupDto } from 'tapestry-shared/src/data-transfer/resources/dtos/group'
import { ColorButton, IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { splitInRows } from 'tapestry-core/src/lib/array'
import { toPairs } from 'lodash-es'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { ColorPickerButton } from 'tapestry-core-client/src/components/lib/buttons/color-picker-button'
import { isOpaque, LiteralColor } from 'tapestry-core-client/src/theme/types'
import { MaybeMenuItem } from 'tapestry-core-client/src/components/lib/toolbar/index'
import styles from './styles.module.css'
import clsx from 'clsx'
import { COLOR_PRESETS, TRANSPARENT } from 'tapestry-core-client/src/theme'

const ALPHA_VALUE = '1a'

const COLOR_SUBMENU_ID = 'group_color'
export type ColorSubmenu = typeof COLOR_SUBMENU_ID

function getTransparentColor(color: LiteralColor): LiteralColor {
  return color.length === 7 ? `${color}${ALPHA_VALUE}` : color
}
interface GroupMenuActions {
  selectSubmenu: (submenu: ColorSubmenu) => void
  selectedSubmenu: string
  onGroupColorChange: (color: LiteralColor | null) => void
  onUngroupSelection: () => void
  onSetHasBackground: (hasBackground: boolean) => void
  onSetHasBorder: (hasBorder: boolean) => void
}

export function getGroupMenuItems(
  group: GroupDto,
  {
    selectSubmenu,
    selectedSubmenu,
    onGroupColorChange,
    onUngroupSelection,
    onSetHasBackground,
    onSetHasBorder,
  }: GroupMenuActions,
): MaybeMenuItem[] {
  const isColorOpaque = group.color ? isOpaque(group.color) : false
  const opaqueColor = group.color?.substring(0, 7) as GroupDto['color']

  const onColorChange = (color: LiteralColor) =>
    onGroupColorChange(
      color === TRANSPARENT ? null : isColorOpaque ? color : getTransparentColor(color),
    )

  return [
    {
      element: <IconButton icon="stack" aria-label="Ungroup" onClick={onUngroupSelection} />,
      tooltip: { side: 'bottom', children: 'Ungroup all' },
    },
    'separator',
    {
      id: COLOR_SUBMENU_ID,
      ui: (
        <ColorButton
          aria-label="Change group color"
          color={group.color ?? TRANSPARENT}
          onClick={() => selectSubmenu(COLOR_SUBMENU_ID)}
          isSelected={selectedSubmenu === COLOR_SUBMENU_ID}
          size={22}
          tooltip={{ side: 'bottom', children: 'Group color' }}
          style={{ '--opaque-color': opaqueColor ?? TRANSPARENT } as React.CSSProperties}
          className={clsx({
            [styles.groupColorButton]: group.color,
            [styles.hasBorder]: group.hasBorder,
            [styles.hasBackground]: group.hasBackground,
          })}
        />
      ),
      direction: 'column',
      submenu: [
        ...splitInRows(
          (toPairs(COLOR_PRESETS) as [LiteralColor, string][])
            .map(([color, label]) => (
              <ColorButton
                key={color}
                color={color}
                size={22}
                aria-label={label}
                onClick={() => onColorChange(color)}
                isSelected={
                  opaqueColor?.toLowerCase() === color.toLowerCase() ||
                  (!group.color && color === TRANSPARENT)
                }
                tooltip={{ side: 'bottom', children: label }}
              />
            ))
            .concat(
              <ColorPickerButton
                key="color picker"
                onChange={(color) => onColorChange(color)}
                size={22}
                color={
                  opaqueColor && !Object.keys(COLOR_PRESETS).includes(opaqueColor)
                    ? opaqueColor
                    : undefined
                }
              />,
            ),
          2,
        ).map((row, index) => (
          <div className={styles.colorButtonsRow} key={index}>
            {row}
          </div>
        )),
        'separator',
        <div className={styles.checkboxes}>
          <Checkbox
            label="Fill"
            checked={group.hasBackground}
            onChange={() => onSetHasBackground(!group.hasBackground)}
            disabled={!group.color}
          />
          <Checkbox
            label="Border"
            checked={group.hasBorder}
            onChange={() => onSetHasBorder(!group.hasBorder)}
            disabled={!group.color}
          />
          <Checkbox
            label="Opaque"
            checked={isColorOpaque}
            onChange={() =>
              opaqueColor &&
              onGroupColorChange(isColorOpaque ? getTransparentColor(opaqueColor) : opaqueColor)
            }
            disabled={!group.color || !group.hasBackground}
          />
        </div>,
      ],
    },
  ]
}
