import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { EditableItemViewModel, EditorSidePaneType } from '../../../pages/tapestry/view-model'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { listAll, resource } from '../../../services/rest-resources'
import { arrayToIdMap } from 'tapestry-core/src/utils'
import { ANNOTATION_EXTENSION_ID_ATTR } from 'tapestry-core/src/tiptap/annotation-extension'
import { compact, noop, uniq } from 'lodash-es'
import { LoadingLogoIcon } from '../../loading-logo-icon'
import { AnnotationsList } from './annotations-list'
import { AnnotationCommentsList } from './annotation-comments-list'
import { useDispatch } from '../../../pages/tapestry/tapestry-providers'
import { setSidePane } from '../../../pages/tapestry/view-model/store-commands/tapestry'
import { AnnotationDto } from 'tapestry-shared/src/data-transfer/resources/dtos/annotation'
import { useFocusElement } from 'tapestry-core-client/src/components/tapestry/hooks/use-focus-element'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'

const domParser = new DOMParser()

export interface AnnotationsListItem {
  id: string
  data?: AnnotationDto
}

interface AnnotationsTabProps {
  annotationId?: string
  interactiveItem: EditableItemViewModel<ItemDto>
}

export function AnnotationsTab({
  interactiveItem: { dto: itemDto },
  annotationId,
}: AnnotationsTabProps) {
  const dispatch = useDispatch()
  const focusElement = useFocusElement()

  const {
    data: annotations,
    loading,
    reload,
  } = useAsync(
    async ({ signal }) => {
      const annotations = await listAll(
        resource('annotations'),
        {
          filter: {
            'itemId:eq': itemDto.id,
          },
          orderBy: '-createdAt',
          include: ['author', 'commentThread'],
        },
        signal,
      )
      const annotationsMap = arrayToIdMap(annotations)
      if (itemDto.type === 'text') {
        const annotationAttributeValues = uniq(
          compact(
            [
              ...domParser
                .parseFromString(itemDto.text, 'text/html')
                .querySelectorAll(`[${ANNOTATION_EXTENSION_ID_ATTR}]`),
            ].map((el) => el.getAttribute(ANNOTATION_EXTENSION_ID_ATTR)),
          ),
        )
        return annotationAttributeValues.map((id) => ({ id, data: annotationsMap[id] }))
      }
      return []
    },
    [itemDto],
  )

  const onCommentsChangedRef = usePropRef(() => reload(noop))

  if (loading || !annotations) {
    return <LoadingLogoIcon />
  }

  const focusAnnotation = (annotationId: string) => focusElement(itemDto.id, { annotationId })
  const openAnnotationCommesnts = (annotationId: string) => {
    focusAnnotation(annotationId)
    dispatch(setSidePane({ type: EditorSidePaneType.ItemAnnotations, data: { annotationId } }))
  }

  return annotationId ? (
    <AnnotationCommentsList
      annotationId={annotationId}
      annotations={annotations}
      onPrev={openAnnotationCommesnts}
      onNext={openAnnotationCommesnts}
      onViewAll={() => dispatch(setSidePane(EditorSidePaneType.ItemAnnotations))}
      onCommentsChanged={onCommentsChangedRef}
    />
  ) : (
    <AnnotationsList
      annotations={annotations}
      itemDto={itemDto}
      onOpenComments={openAnnotationCommesnts}
      onAnnotationFocus={focusAnnotation}
      onDelete={() => reload(noop)}
    />
  )
}
