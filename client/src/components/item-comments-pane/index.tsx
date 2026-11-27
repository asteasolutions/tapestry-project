import styles from './styles.module.css'
import { CommentsList } from '../comments-list'
import { TabPanel } from 'tapestry-core-client/src/components/lib/tab-panel/index'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import {
  setPendingAnnotation,
  setSidePane,
  setSnackbar,
} from '../../pages/tapestry/view-model/store-commands/tapestry'
import { EditorSidePaneType, TapestrySearchParams } from '../../pages/tapestry/view-model'
import { AnnotationCommentInput } from './annotation-comment-input'
import { AnnotationsTab } from './annotations-tab'
import { ItemType } from 'tapestry-core/src/data-format/schemas/item'
import { useFocusElement } from 'tapestry-core-client/src/components/tapestry/hooks/use-focus-element'

export const SUPPORTING_ANNOTATION_ITEM_TYPES: ItemType[] = ['text']

export interface ItemCommentsPaneProps {
  commentsPaneType: EditorSidePaneType.ItemComments | EditorSidePaneType.ItemAnnotations
  annotationId?: string
}

export function ItemCommentsPane({ commentsPaneType, annotationId }: ItemCommentsPaneProps) {
  const { interactiveElement, pendingAnnotation } = useTapestryData([
    'interactiveElement',
    'pendingAnnotation',
  ])
  const interactiveItem = useTapestryData(`items.${interactiveElement?.modelId ?? 'no-id'}`)
  const dispatch = useDispatch()
  const focusElement = useFocusElement<TapestrySearchParams>()

  if (!interactiveItem) {
    return
  }

  if (!SUPPORTING_ANNOTATION_ITEM_TYPES.includes(interactiveItem.dto.type)) {
    return <CommentsList contextType="item" contextId={interactiveItem.dto.id} />
  }

  // TODO: get comment size info on each tab in comment thread
  // const inlineComments = interactiveItem?.commentThread?.size

  return (
    <div className={styles.root}>
      <TabPanel
        tabs={{
          'item-annotations': 'Inline',
          'item-comments': 'General',
        }}
        selected={commentsPaneType}
        onSelect={(tabId) => {
          dispatch(setSidePane(tabId))
        }}
      />
      {commentsPaneType === EditorSidePaneType.ItemComments ? (
        <CommentsList contextType="item" contextId={interactiveItem.dto.id} />
      ) : pendingAnnotation ? (
        <AnnotationCommentInput
          pendingAnnotation={pendingAnnotation}
          onCreate={(newAnnotationId) => {
            dispatch(
              setPendingAnnotation(null),
              setSidePane({
                type: EditorSidePaneType.ItemAnnotations,
                data: { annotationId: newAnnotationId },
              }),
            )
            focusElement(interactiveItem.dto.id, { annotationId: newAnnotationId })
          }}
          onError={() =>
            dispatch(
              setSnackbar({ content: 'Error while creating inline comment', variant: 'error' }),
            )
          }
        />
      ) : (
        <AnnotationsTab interactiveItem={interactiveItem} annotationId={annotationId} />
      )}
    </div>
  )
}
