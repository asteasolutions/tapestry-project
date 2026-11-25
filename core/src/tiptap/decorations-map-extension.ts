import { Decoration, Extension } from '@tiptap/core'
import { compact } from 'lodash-es'

// see node_modules/prosemirror-view/dist/index.d.ts:142
interface DecorationProps {
  nodeName?: string
  class?: string
  style?: string
  /**
    Any other properties are treated as regular DOM attributes.
    */
  [attribute: string]: string | undefined
}

interface DecorationRange {
  from: number
  to: number
  props: DecorationProps
}

interface DecorationsMapOptions {
  ranges: Record<string, DecorationRange[]>
}

interface DecorationsMapStorage {
  ranges: Partial<Record<string, DecorationRange[]>>
}

declare module '@tiptap/core' {
  interface Storage {
    decorationsMap: DecorationsMapStorage
  }

  interface Commands<ReturnType> {
    decorationsMap: {
      addSelectionToDecorationsMap: (key: string, props: DecorationProps) => ReturnType
      addDecorationToMap: (key: string, props: DecorationRange) => ReturnType
      removeDecorationsFromMap: (key: string) => ReturnType
    }
  }
}

/** Demo extension showing inline, widget, and node decorations. */
export const DecoratoinsMapExtension = Extension.create<
  DecorationsMapOptions,
  DecorationsMapStorage
>({
  name: 'decorationsMap',

  addOptions() {
    return {
      ranges: {},
    }
  },

  addStorage() {
    return {
      ranges: {},
    }
  },

  addDecorations() {
    return {
      // Only rescan changed blocks on edits; force full rebuild on term change.
      update: 'manual',

      create: ({ editor }) =>
        compact(Object.values(editor.storage.decorationsMap.ranges))
          .flat()
          .map(({ from, to, props }) => Decoration.Inline(from, to, props)),
    }
  },

  addCommands() {
    return {
      addDecorationToMap:
        (key, { from, to, props }) =>
        ({ editor }) => {
          editor.storage.decorationsMap.ranges[key] ??= []
          editor.storage.decorationsMap.ranges[key].push({
            from,
            to,
            props,
          })
          return editor.commands.updateDecorations('decorationsMap')
        },
      addSelectionToDecorationsMap:
        (key, props) =>
        ({ editor, state }) => {
          return editor.commands.addDecorationToMap(key, {
            from: state.selection.from,
            to: state.selection.to,
            props,
          })
        },
      removeDecorationsFromMap:
        (key) =>
        ({ editor }) => {
          editor.storage.decorationsMap.ranges[key] = []
          return editor.commands.updateDecorations('decorationsMap')
        },
    }
  },
})
