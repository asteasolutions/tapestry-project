import { Mark, mergeAttributes } from '@tiptap/core'

export interface AnnotationExtensionOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotation: {
      setAnnotation: (note: string) => ReturnType
      unsetAnnotation: () => ReturnType
    }
  }
}

export const ANNOTATION_EXTENSION_ID_ATTR = 'data-annotation-id'

export const AnnotationExtension = Mark.create<AnnotationExtensionOptions>({
  name: 'annotation',
  // This allows annotations to overlap
  excludes: '',

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute(ANNOTATION_EXTENSION_ID_ATTR),
        renderHTML: ({ id }: { id?: string | null }) =>
          id ? { [ANNOTATION_EXTENSION_ID_ATTR]: id } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: `span[${ANNOTATION_EXTENSION_ID_ATTR}]` }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setAnnotation:
        (id) =>
        ({ chain }) =>
          chain().setMark(this.name, { id }).run(),
      unsetAnnotation:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    }
  },
})
