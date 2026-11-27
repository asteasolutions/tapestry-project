import {
  OrderedList as TiptapOrderedList,
  BulletList as TiptapBulletList,
} from '@tiptap/extension-list'
import { createSelectionState, getSelectionCommands } from '.'

export const OrderedList = TiptapOrderedList.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-7': () => {
        const { color, fontSize } = createSelectionState(this.editor)
        return getSelectionCommands(this.editor).ol(fontSize, color)
      },
    }
  },
})

export const BulletList = TiptapBulletList.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-8': () => {
        const { color, fontSize } = createSelectionState(this.editor)
        return getSelectionCommands(this.editor).ul(fontSize, color)
      },
    }
  },
})
