import { BulletListOptions } from '@tiptap/extension-bullet-list'
import { ColorOptions } from '@tiptap/extension-color'
import FontFamily, { FontFamilyOptions } from '@tiptap/extension-font-family'
import Highlight, { HighlightOptions } from '@tiptap/extension-highlight'
import Link, { LinkOptions } from '@tiptap/extension-link'
import { OrderedListOptions } from '@tiptap/extension-ordered-list'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign, { TextAlignOptions } from '@tiptap/extension-text-align'
import TextStyle, { TextStyleOptions } from '@tiptap/extension-text-style'
import Underline, { UnderlineOptions } from '@tiptap/extension-underline'
import {
  Editor,
  EditorContent,
  Extension,
  Extensions,
  FocusPosition,
  Mark,
  Node,
  useEditor,
} from '@tiptap/react'
import StarterKit, { StarterKitOptions } from '@tiptap/starter-kit'
import clsx from 'clsx'
import ColorConstructor from 'color'
import { compact, mapValues, trim } from 'lodash-es'
import { MouseEventHandler, useRef } from 'react'
import { PropsWithStyle } from '..'
import { LiteralColor } from '../../../theme/types'
import { Color } from './color-extension'
import { FontSizeExtension } from './font-size-extension'
import { BulletList, OrderedList } from './list-extensions'
import styles from './styles.module.css'

interface SelectionCommands {
  bold: () => unknown
  italic: () => unknown
  underline: () => unknown
  link: (href: string) => unknown
  strike: () => unknown
  ol: (fontSize?: number, color?: string) => unknown
  ul: (fontSize?: number, color?: string) => unknown
  fgColor: (color: string) => unknown
  fontSize: (size: number) => unknown
  align: (alignment: 'left' | 'center' | 'right') => unknown
  fontFamily: (font: string) => unknown
}

export interface RichTextEditorApi extends SelectionCommands {
  editor: () => Editor
  text: () => string
  selectionText: () => string
  focus: (pos?: FocusPosition) => unknown
}

export function getSelectionCommands(editor: Editor) {
  return {
    bold: () => editor.chain().toggleBold().run(),
    italic: () => editor.chain().toggleItalic().run(),
    underline: () => editor.chain().toggleUnderline().run(),
    link: (href) => editor.chain().toggleLink({ href }).run(),
    strike: () => editor.chain().toggleStrike().run(),
    ol: (fontSize, color) =>
      editor.chain().toggleOrderedList().updateAttributes('listItem', { color, fontSize }).run(),
    ul: (fontSize, color) =>
      editor.chain().toggleBulletList().updateAttributes('listItem', { color, fontSize }).run(),
    fgColor: (color) => editor.chain().setColor(color).run(),
    fontSize: (size) => editor.chain().setFontSize(size).run(),
    align: (alignment) => editor.chain().setTextAlign(alignment).run(),
    fontFamily: (font) => editor.chain().setFontFamily(font).run(),
  } satisfies SelectionCommands
}

function getRichTextEditorApi(
  editor: Editor,
  onSelectionChanged?: (state: SelectionState) => unknown,
): RichTextEditorApi {
  return {
    ...mapValues(getSelectionCommands(editor), (command) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (...args: any[]) => {
        // @ts-expect-error command is of union type and typescript can not infer its argument type
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        command(...args)
        editor.chain().focus(null, { scrollIntoView: false }).run()
        onSelectionChanged?.(createSelectionState(editor))
      }
    }),
    editor: () => editor,
    text: () => editor.getText(),
    selectionText: () =>
      editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to),
    focus: (pos = null) => editor.chain().focus(pos, { scrollIntoView: false }).run(),
  }
}

export interface SelectionState {
  text: string
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  isLink: boolean
  isStrike: boolean
  isOL: boolean
  isUL: boolean
  highlight: string | undefined
  color: LiteralColor | undefined
  fontSize: number | undefined
  fontFamily: string
  leftAligned: boolean
  centerAligned: boolean
  rightAligned: boolean
}

export interface Controls {
  format?: false | [Extension<StarterKitOptions> | Mark<UnderlineOptions> | Mark<TextStyleOptions>]
  list?: false | [Node<OrderedListOptions> | Node<BulletListOptions>]
  link?: false | Node<LinkOptions>
  color?: false | [Extension<ColorOptions> | Mark<HighlightOptions>]
  justification?: false | Extension<TextAlignOptions>
  fontSize?: false | Extension
  fontFamily?: false | Extension<FontFamilyOptions>
}

export interface RichTextEditorProps extends PropsWithStyle {
  value: string
  isEditable: boolean
  api?: React.RefObject<RichTextEditorApi | undefined>
  placeholder?: string
  events?: {
    onChange?: (value: string) => unknown
    onCreate?: (editor: Editor) => unknown
    onSelectionChanged?: (state: SelectionState) => unknown
    onCreateLink?: () => boolean
    onClick?: MouseEventHandler<HTMLDivElement>
    onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => unknown
  }
  controls?: Controls
}

interface ExtensionOptions {
  placeholder?: string
  onCreateLink: () => boolean
  controls?: Controls
}

function getExtensions({ placeholder, onCreateLink, controls = {} }: ExtensionOptions): Extensions {
  return compact([
    ...(controls.format === false
      ? []
      : (controls.format ?? [
          StarterKit.configure({ bulletList: false, orderedList: false }),
          Underline,
          TextStyle,
        ])),
    ...(controls.list === false ? [] : (controls.list ?? [OrderedList, BulletList])),
    controls.link === false
      ? undefined
      : (controls.link ??
        Link.configure({ autolink: false, openOnClick: false }).extend({
          addKeyboardShortcuts: () => ({
            'Mod-k': onCreateLink,
          }),
        })),
    ...(controls.color === false
      ? []
      : (controls.color ?? [Color, Highlight.configure({ multicolor: true })])),
    controls.justification === false
      ? undefined
      : (controls.justification ?? TextAlign.configure({ types: ['heading', 'paragraph'] })),
    controls.fontSize === false ? undefined : (controls.fontSize ?? FontSizeExtension),
    controls.fontFamily === false ? undefined : (controls.fontFamily ?? FontFamily),
    ...(placeholder ? [Placeholder.configure({ placeholder, showOnlyWhenEditable: false })] : []),
  ])
}

function parseColor(color?: string): LiteralColor | undefined {
  if (!color) {
    return undefined
  }
  try {
    return new ColorConstructor(color).hex().toLowerCase() as LiteralColor
  } catch {
    return undefined
  }
}

export function createSelectionState(editor: Editor): SelectionState {
  const { selection, doc } = editor.state
  return {
    text: doc.textBetween(selection.from, selection.to),
    isBold: editor.isActive('bold'),
    isItalic: editor.isActive('italic'),
    isUnderline: editor.isActive('underline'),
    isLink: editor.isActive('link'),
    isStrike: editor.isActive('strike'),
    isOL: editor.isActive('orderedList'),
    isUL: editor.isActive('bulletList'),
    highlight: editor.getAttributes('highlight').color as string | undefined,
    color: parseColor(editor.getAttributes('textStyle').color as string | undefined),
    fontSize: editor.getAttributes('textStyle').fontSize as number | undefined,
    fontFamily: trim(editor.getAttributes('textStyle').fontFamily as string | undefined, '"'),
    leftAligned: editor.isActive({ textAlign: 'left' }),
    centerAligned: editor.isActive({ textAlign: 'center' }),
    rightAligned: editor.isActive({ textAlign: 'right' }),
  }
}

export function RichTextEditor({
  value,
  isEditable,
  style,
  api,
  placeholder,
  events,
  className,
  controls,
}: RichTextEditorProps) {
  const eventsRef = useRef(events)
  eventsRef.current = events
  const editor = useEditor(
    {
      extensions: getExtensions({
        placeholder,
        onCreateLink: () => eventsRef.current?.onCreateLink?.() ?? true,
        controls,
      }),
      content: value,
      editable: isEditable,
      parseOptions: {
        preserveWhitespace: true,
      },
      onSelectionUpdate: ({ editor }) => {
        eventsRef.current?.onSelectionChanged?.(createSelectionState(editor))
      },
      onCreate: ({ editor }) => {
        eventsRef.current?.onCreate?.(editor)
      },
      onUpdate: ({ editor }) => {
        eventsRef.current?.onChange?.(editor.getHTML())
      },
    },
    [isEditable, value],
  )!

  if (api) {
    api.current = getRichTextEditorApi(editor, eventsRef.current?.onSelectionChanged)
  }

  return (
    <div style={style} className={clsx(styles.root, className)}>
      <EditorContent
        editor={editor}
        className="content"
        onKeyDown={(e) => {
          events?.onKeyDown?.(e)
          e.stopPropagation()
        }}
        onPaste={(e) => e.stopPropagation()}
        onCopy={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={eventsRef.current?.onClick}
      />
    </div>
  )
}
