import { Extension } from '@tiptap/react'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: number) => ReturnType
    }
  }
}

export const DEFAULT_FONT_SIZE = 16

export const FontSizeExtension = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: DEFAULT_FONT_SIZE,
            parseHTML: (element) => Number.parseInt(element.style.fontSize.replace('px', '')),
            renderHTML: (attributes) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}px` } : {},
          },
        },
      },
      {
        types: ['listItem'],
        attributes: {
          fontSize: {
            parseHTML: (element) =>
              Number.parseInt(/--marker-font-size: (\d+)px/.exec(element.style.cssText)?.[1] ?? ''),
            renderHTML: (attributes) =>
              attributes.fontSize ? { style: `--marker-font-size: ${attributes.fontSize}px` } : {},
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) => {
          return chain()
            .updateAttributes('listItem', { fontSize })
            .setMark('textStyle', { fontSize })
            .run()
        },
    }
  },
})
