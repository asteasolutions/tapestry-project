import { thru, toPairs } from 'lodash-es'
import { ColorPickerButton } from 'tapestry-core-client/src/components/lib/buttons/color-picker-button'
import { ColorButton, IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import {
  Controls,
  RichTextEditorApi,
  SelectionState,
} from 'tapestry-core-client/src/components/lib/rich-text-editor'
import { DEFAULT_FONT_SIZE } from 'tapestry-core-client/src/components/lib/rich-text-editor/font-size-extension'
import { ShortcutLabel } from 'tapestry-core-client/src/components/lib/shortcut-label'
import { MaybeMenuItem } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { shortcutLabel } from 'tapestry-core-client/src/lib/keyboard-event'
import { COLOR_PRESETS, OPAQUE_COLOR_PRESETS, TRANSPARENT } from 'tapestry-core-client/src/theme'
import { LiteralColor } from 'tapestry-core-client/src/theme/types'
import { splitInRows } from 'tapestry-core/src/lib/array'
import { userSettings } from '../../../../../services/user-settings'
import { DEFAULT_FONT, FontFamilySelector } from '../font-family-selector'
import { FontSizeInput } from '../font-size-input'
import styles from './styles.module.css'

const BACKGROUND_COLORS = COLOR_PRESETS
const FOREGROUND_COLORS = OPAQUE_COLOR_PRESETS

export type FormattingSubmenu = 'text-color' | 'text-background'

interface TextItemToolbarOptions {
  selection: SelectionState | undefined
  editorAPI: React.RefObject<RichTextEditorApi | undefined>
  tapestryId: string
  onLinkClick?: () => unknown
  canAddLink?: boolean
  itemBackgroundColor: LiteralColor | null | undefined
  onBackgroundColorChange: (color: LiteralColor) => unknown
  onColorChange: (color: LiteralColor) => unknown
  onToggleMenu: (id: '' | FormattingSubmenu) => unknown
  controls?: { [K in keyof Controls]: boolean }
}

export function textItemToolbar({
  selection,
  editorAPI,
  tapestryId,
  onLinkClick,
  canAddLink,
  itemBackgroundColor,
  onBackgroundColorChange,
  onColorChange,
  onToggleMenu,
  controls,
}: TextItemToolbarOptions): MaybeMenuItem[] {
  const foregroundColor = selection?.color
  const backgroundColor = itemBackgroundColor ?? TRANSPARENT
  const isCustomBackgroundColor =
    itemBackgroundColor && !Object.keys(BACKGROUND_COLORS).includes(backgroundColor)

  const isCustomForegroundColor =
    foregroundColor && !Object.keys(FOREGROUND_COLORS).includes(foregroundColor)

  return thru(
    [
      ...(controls?.fontFamily === false
        ? []
        : ([
            <FontFamilySelector
              value={selection?.fontFamily || DEFAULT_FONT.value}
              onChange={(font) => editorAPI.current?.fontFamily(font)}
              onMenuOpen={() => onToggleMenu('')}
            />,
            'separator',
          ] as const)),
      ...(controls?.fontSize === false
        ? []
        : ([
            <FontSizeInput
              value={selection?.fontSize ?? DEFAULT_FONT_SIZE}
              onChange={(fontSize) => {
                userSettings.updateTapestrySettings(tapestryId, { fontSize })
                editorAPI.current?.fontSize(fontSize)
              }}
              onMenuOpen={() => onToggleMenu('')}
            />,
            'separator',
          ] as const)),
      ...(controls?.format === false
        ? []
        : ([
            {
              element: (
                <IconButton
                  icon="format_bold"
                  aria-label="Toggle bold"
                  onClick={() => editorAPI.current?.bold()}
                  isActive={selection?.isBold}
                />
              ),
              tooltip: {
                side: 'bottom',
                children: <ShortcutLabel text="Bold">{shortcutLabel('meta + B')}</ShortcutLabel>,
              },
            },
            {
              element: (
                <IconButton
                  icon="format_italic"
                  aria-label="Toggle italic"
                  onClick={() => editorAPI.current?.italic()}
                  isActive={selection?.isItalic}
                />
              ),
              tooltip: {
                side: 'bottom',
                children: <ShortcutLabel text="Italic">{shortcutLabel('meta + I')}</ShortcutLabel>,
              },
            },
            {
              element: (
                <IconButton
                  icon="format_underlined"
                  aria-label="Toggle underline"
                  onClick={() => editorAPI.current?.underline()}
                  isActive={selection?.isUnderline}
                />
              ),
              tooltip: {
                side: 'bottom',
                children: (
                  <ShortcutLabel text="Underline">{shortcutLabel('meta + U')}</ShortcutLabel>
                ),
              },
            },
            {
              element: (
                <IconButton
                  icon="strikethrough_s"
                  aria-label="Toggle strikethrough"
                  onClick={() => editorAPI.current?.strike()}
                  isActive={selection?.isStrike}
                />
              ),
              tooltip: {
                side: 'bottom',
                children: (
                  <ShortcutLabel text="Strikethrough">
                    {shortcutLabel('meta + shift + S')}
                  </ShortcutLabel>
                ),
              },
            },
            'separator',
          ] as const)),
      ...(controls?.link === false
        ? []
        : ([
            {
              element: (
                <IconButton
                  icon="add_link"
                  aria-label="Insert link"
                  onClick={() => onLinkClick?.()}
                  isActive={canAddLink}
                />
              ),
              tooltip: {
                side: 'bottom',
                children: (
                  <ShortcutLabel text="Add link">{shortcutLabel('meta + K')}</ShortcutLabel>
                ),
              },
            },
            'separator',
          ] as const)),
      ...(controls?.color === false
        ? []
        : ([
            {
              id: 'text-color',
              ui: {
                element: (
                  <IconButton
                    icon="format_color_text"
                    aria-label="Format text color"
                    onClick={() => onToggleMenu('text-color')}
                    style={{ '--editor-text-color': foregroundColor } as React.CSSProperties}
                    className={styles.textColorPicker}
                  />
                ),
                tooltip: { side: 'bottom', children: 'Text color' },
              },

              submenu: splitInRows(
                (toPairs(FOREGROUND_COLORS) as [LiteralColor, string][])
                  .map(([color, label]) => (
                    <ColorButton
                      key={color}
                      color={color}
                      size={22}
                      aria-label={label}
                      onClick={() => onColorChange(color)}
                      isSelected={foregroundColor === color.toLowerCase()}
                      tooltip={{ side: 'bottom', children: label }}
                    />
                  ))
                  .concat(
                    <ColorPickerButton
                      onChange={(color) => onColorChange(color)}
                      size={22}
                      color={isCustomForegroundColor ? foregroundColor : undefined}
                      key="custom"
                    />,
                  ),
                3,
              ),
            },
            {
              id: 'text-background',
              ui: {
                element: (
                  <ColorButton
                    aria-label="Change background"
                    color={backgroundColor}
                    onClick={() => onToggleMenu('text-background')}
                    size={22}
                  />
                ),
                tooltip: { side: 'bottom', children: 'Background color' },
              },
              submenu: splitInRows(
                (toPairs(BACKGROUND_COLORS) as [LiteralColor, string][])
                  .map(([color, label]) => (
                    <ColorButton
                      key={color}
                      color={color}
                      size={22}
                      aria-label={label}
                      onClick={() => onBackgroundColorChange(color)}
                      isSelected={itemBackgroundColor?.toLowerCase() === color.toLowerCase()}
                      tooltip={{ side: 'bottom', children: label }}
                    />
                  ))
                  .concat(
                    <ColorPickerButton
                      onChange={(color) => onBackgroundColorChange(color)}
                      size={22}
                      color={isCustomBackgroundColor ? itemBackgroundColor : undefined}
                    />,
                  ),
                3,
              ),
            },
            'separator',
          ] as const)),
      ...(controls?.justification === false
        ? []
        : ([
            {
              element: (
                <IconButton
                  icon="format_align_left"
                  aria-label="Align left"
                  onClick={() => {
                    editorAPI.current?.align('left')
                  }}
                  isActive={selection?.leftAligned}
                />
              ),
              tooltip: {
                side: 'bottom',
                children: (
                  <ShortcutLabel text="Align left">
                    {shortcutLabel('meta + shift + L')}
                  </ShortcutLabel>
                ),
              },
            },
            {
              element: (
                <IconButton
                  icon="format_align_center"
                  aria-label="Align center"
                  onClick={() => {
                    editorAPI.current?.align('center')
                  }}
                  isActive={selection?.centerAligned}
                />
              ),
              tooltip: {
                side: 'bottom',
                children: (
                  <ShortcutLabel text="Align left">
                    {shortcutLabel('meta + shift + E')}
                  </ShortcutLabel>
                ),
              },
            },
            {
              element: (
                <IconButton
                  icon="format_align_right"
                  aria-label="Align right"
                  onClick={() => {
                    editorAPI.current?.align('right')
                  }}
                  isActive={selection?.rightAligned}
                />
              ),
              tooltip: {
                side: 'bottom',
                children: (
                  <ShortcutLabel text="Align left">
                    {shortcutLabel('meta + shift + R')}
                  </ShortcutLabel>
                ),
              },
            },
            'separator',
          ] as const)),
      ...(controls?.list === false
        ? []
        : ([
            {
              element: (
                <IconButton
                  icon="format_list_bulleted"
                  aria-label="Toggle bulleted list"
                  onClick={() => {
                    editorAPI.current?.ul(selection?.fontSize, foregroundColor)
                  }}
                  isActive={selection?.isUL}
                />
              ),
              tooltip: {
                side: 'bottom',
                children: (
                  <ShortcutLabel text="Bulleted list">
                    {shortcutLabel('meta + shift + 8')}
                  </ShortcutLabel>
                ),
              },
            },
            {
              element: (
                <IconButton
                  icon="format_list_numbered"
                  aria-label="Toggle numbered list"
                  onClick={() => {
                    editorAPI.current?.ol(selection?.fontSize, foregroundColor)
                  }}
                  isActive={selection?.isOL}
                />
              ),
              tooltip: {
                side: 'bottom',
                children: (
                  <ShortcutLabel text="Numbered list">
                    {shortcutLabel('meta + shift + 7')}
                  </ShortcutLabel>
                ),
              },
            },
          ] as const)),
    ],
    (controls) => {
      if (controls.at(-1) === 'separator') {
        return controls.slice(0, -1)
      }
      return controls
    },
  )
}
