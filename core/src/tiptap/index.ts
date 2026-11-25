import { Editor, Extension, Extensions, Mark, Node } from '@tiptap/core'
import { ColorOptions } from '@tiptap/extension-color'
import FontFamily, { FontFamilyOptions } from '@tiptap/extension-font-family'
import Highlight, { HighlightOptions } from '@tiptap/extension-highlight'
import Link, { LinkOptions } from '@tiptap/extension-link'
import { BulletListOptions, OrderedListOptions } from '@tiptap/extension-list'
import TextAlign, { TextAlignOptions } from '@tiptap/extension-text-align'
import { TextStyle, TextStyleOptions } from '@tiptap/extension-text-style'
import Underline, { UnderlineOptions } from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extensions'
import StarterKit, { StarterKitOptions } from '@tiptap/starter-kit'
import { Color } from './color-extension'
import { AnnotationExtension, AnnotationExtensionOptions } from './annotation-extension'
import { FontSizeExtension } from './font-size-extension'
import { DecoratoinsMapExtension } from './decorations-map-extension'
import ColorConstructor from 'color'
import { compact, trim } from 'lodash-es'
import { BulletList, OrderedList } from './list-extensions'
import { LiteralColor } from '../lib/string'

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

export function getSelectionText(editor: Editor): string {
  const { selection, doc } = editor.state
  return doc.textBetween(selection.from, selection.to)
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
  return {
    text: getSelectionText(editor),
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

export interface SelectionCommands {
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

export interface Controls {
  format: true | [Extension<StarterKitOptions> | Mark<UnderlineOptions> | Mark<TextStyleOptions>]
  list?: true | [Node<OrderedListOptions> | Node<BulletListOptions>]
  link?: true | Node<LinkOptions>
  color?: true | [Extension<ColorOptions> | Mark<HighlightOptions>]
  justification?: true | Extension<TextAlignOptions>
  fontSize?: true | Extension
  fontFamily?: true | Extension<FontFamilyOptions>
  annotation?: true | Mark<AnnotationExtensionOptions>
  decorationsMap?: true
}

interface ExtensionOptions {
  placeholder?: string
  onCreateLink: () => boolean
  controls?: Controls
}

export function getExtensions({
  placeholder,
  onCreateLink,
  controls = { format: true },
}: ExtensionOptions): Extensions {
  return compact([
    ...(controls.format === true
      ? [
          StarterKit.configure({
            bulletList: false,
            orderedList: false,
            link: false,
            underline: false,
          }),
          Underline,
          TextStyle,
        ]
      : controls.format),
    ...(controls.list === true ? [OrderedList, BulletList] : (controls.list ?? [])),
    controls.link === true
      ? Link.configure({ autolink: false, openOnClick: false }).extend({
          addKeyboardShortcuts: () => ({
            'Mod-k': onCreateLink,
          }),
        })
      : controls.link,
    ...(controls.color === true
      ? [Color, Highlight.configure({ multicolor: true })]
      : (controls.color ?? [])),
    controls.justification === true
      ? TextAlign.configure({ types: ['heading', 'paragraph'] })
      : controls.justification,
    controls.fontSize === true ? FontSizeExtension : controls.fontSize,
    controls.fontFamily === true ? FontFamily : controls.fontFamily,
    controls.annotation === true ? AnnotationExtension : controls.annotation,
    controls.decorationsMap && DecoratoinsMapExtension,
    placeholder && Placeholder.configure({ placeholder, showOnlyWhenEditable: false }),
  ])
}
