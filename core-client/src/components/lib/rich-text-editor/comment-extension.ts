import { Mark, mergeAttributes } from '@tiptap/core'

export interface CommentOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      setComment: (note: string) => ReturnType
      unsetComment: () => ReturnType
    }
  }
}

const ID_ATTR = 'data-annotation-id'

export const Comment = Mark.create<CommentOptions>({
  name: 'comment',

  addAttributes() {
    return {
      note: {
        default: null,
        parseHTML: (element) => element.getAttribute(ID_ATTR),
        renderHTML: ({ note }: { note?: string | null }) => (note ? { [ID_ATTR]: note } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: `span[${ID_ATTR}]` }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setComment:
        (note) =>
        ({ chain }) =>
          chain().setMark(this.name, { note }).run(),
      unsetComment:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    }
  },
})
