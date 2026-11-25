import { Color as TiptapColor } from '@tiptap/extension-color'

export const Color = TiptapColor.extend({
  addGlobalAttributes() {
    return [
      ...(this.parent ? this.parent() : []),
      {
        types: ['listItem'],
        attributes: {
          color: {
            parseHTML: (element) =>
              /--marker-color: ([^;]+);/.exec(element.style.cssText)?.[1] ?? '',
            renderHTML: (attributes) =>
              attributes.color ? { style: `--marker-color: ${attributes.color}` } : {},
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      ...(this.parent ? this.parent() : {}),
      setColor:
        (color) =>
        ({ chain }) => {
          return chain()
            .updateAttributes('listItem', { color })
            .setMark('textStyle', { color })
            .run()
        },
    }
  },
})
