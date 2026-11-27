import { isTextSelection } from '@tiptap/react'
import { BubbleMenu, BubbleMenuProps } from '@tiptap/react/menus'
import { useCallback, useRef, useState } from 'react'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'
import styles from './styles.module.css'
import editorStyles from '../styles.module.css'
import 'tapestry-core/src/tiptap/decorations-map-extension'
import { useDispatch, useTapestryData } from '../../../../../pages/tapestry/tapestry-providers'
import {
  setPendingAnnotation,
  setSidePane,
} from '../../../../../pages/tapestry/view-model/store-commands/tapestry'
import { EditorSidePaneType } from '../../../../../pages/tapestry/view-model'
import { RichTextEditorApi } from 'tapestry-core-client/src/components/lib/rich-text-editor'
import { focusItems } from '../../../../../pages/tapestry/view-model/store-commands/viewport'

export const BUBBLE_MENU_PLUGIN_KEY = 'bubbleMenu'
export const PENDING_ANNOTATION_DECORATION_KEY = 'pendingAnnotation'

export interface AnnotationBubbleMenuProps {
  editorAPI: React.RefObject<RichTextEditorApi | undefined>
  itemId: string
  onPendingAnnotation: () => void
}

export function AnnotationBubbleMenu({
  editorAPI,
  itemId,
  onPendingAnnotation,
}: AnnotationBubbleMenuProps) {
  const [wasAdding, setWasAdding] = useState(false)
  const dispatch = useDispatch()
  const pendingAnnotation = useTapestryData('pendingAnnotation')
  const isAdding = pendingAnnotation?.itemId === itemId

  const bubbleMenuRef = useRef<HTMLDivElement>(null)
  const editor = editorAPI.current?.editor()

  if (wasAdding !== isAdding) {
    if (!isAdding) {
      editor?.commands.removeDecorationsFromMap(PENDING_ANNOTATION_DECORATION_KEY)
    }
    setWasAdding(isAdding)
  }

  // from node_modules/@tiptap/extension-bubble-menu/src/bubble-menu-plugin.ts - BubbleMenuView
  const shouldShow = useCallback<NonNullable<BubbleMenuProps['shouldShow']>>(
    ({ view, state, from, to }) => {
      const { doc, selection } = state

      // Sometime check for `empty` is not enough.
      // Doubleclick an empty paragraph returns a node size of 2.
      // So we check also for an empty text size.
      const isEmptyTextBlock = !doc.textBetween(from, to).length && isTextSelection(selection)

      const domSelectionFocusNode = window.getSelection()?.focusNode
      const hasEditorFocus =
        (domSelectionFocusNode && view.dom.contains(domSelectionFocusNode)) ||
        bubbleMenuRef.current?.contains(document.activeElement)

      if (!hasEditorFocus || selection.empty || isEmptyTextBlock) {
        return false
      }

      return true
    },
    [],
  )

  if (!editor) {
    return
  }

  return (
    <BubbleMenu
      editor={editor}
      className={styles.root}
      pluginKey={BUBBLE_MENU_PLUGIN_KEY}
      data-captures-pointer-events
      appendTo={document.querySelector<HTMLElement>(`[data-model-id="${itemId}"]`) ?? undefined}
      style={{
        transform: 'scale(calc(1 / var(--scale)))',
        transformOrigin: '100% 0',
      }}
      options={{
        placement: 'bottom-end',
      }}
      ref={bubbleMenuRef}
      shouldShow={shouldShow}
    >
      <Button
        icon="add_comment"
        aria-label="Annotate selection"
        variant="tertiary"
        className={styles.addCommentButton}
        onClick={() => {
          const editor = editorAPI.current?.editor()

          // this hides the bubble menu explicitly, because it doesn't disappear on its own
          editor?.commands.setMeta(BUBBLE_MENU_PLUGIN_KEY, 'hide')

          // adds color to the annotated text so it remains visible
          editor?.commands.addSelectionToDecorationsMap(PENDING_ANNOTATION_DECORATION_KEY, {
            class: editorStyles.pendingAnnotation,
          })
          window.getSelection()?.removeAllRanges()

          const selection = editor?.state.selection
          dispatch(
            selection &&
              setPendingAnnotation({
                itemId,
                from: selection.from,
                to: selection.to,
                annotationType: 'text',
                isHighlight: false,
              }),
            setSidePane(EditorSidePaneType.ItemAnnotations),
          )
          onPendingAnnotation()
          /* We use set timeout so that the new viewport obstructions from the side pane can be calculated
             TODO: see if it can be removed when we implement the docked comments pane */
          window.setTimeout(() => dispatch(focusItems([itemId])))
        }}
        tooltip={{ children: 'Annotate selection', side: 'bottom' }}
      >
        Comment
      </Button>
    </BubbleMenu>
  )
}
