import { Button } from 'tapestry-core-client/src/components/lib/buttons'
import styles from './styles.module.css'
import { CommentsList } from '../../../comments-list'
import { AnnotationsListItem } from '..'
import { useMemo } from 'react'
import { Icon } from 'tapestry-core-client/src/components/lib/icon'

interface AnnotationCommentsListProps {
  annotationId: string
  annotations: AnnotationsListItem[]
  onPrev: (annoationId: string) => void
  onNext: (annoationId: string) => void
  onViewAll: () => void
  onCommentsChanged: React.RefObject<() => void>
}

export function AnnotationCommentsList({
  annotationId,
  annotations,
  onViewAll,
  onPrev,
  onNext,
  onCommentsChanged,
}: AnnotationCommentsListProps) {
  const annotationIndex = useMemo(
    () => annotations.findIndex((a) => a.id === annotationId),
    [annotations, annotationId],
  )

  if (annotationIndex < 0 || !annotations[annotationIndex].data) {
    return 'MISSING ANNOTATION'
  }

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        {annotationIndex > 0 ? (
          <Button
            variant="tertiary"
            style={{ marginRight: 'auto' }}
            onClick={() => onPrev(annotations[annotationIndex - 1].id)}
          >
            <Icon icon="chevron_left" /> Previous
          </Button>
        ) : (
          <div />
        )}
        <Button variant="tertiary" onClick={onViewAll}>
          View all
        </Button>
        {annotationIndex < annotations.length - 1 && (
          <Button
            variant="tertiary"
            style={{ marginLeft: 'auto' }}
            onClick={() => onNext(annotations[annotationIndex + 1].id)}
          >
            Next <Icon icon="chevron_right" />
          </Button>
        )}
      </div>
      <CommentsList
        contextType="itemAnnotation"
        contextId={annotationId}
        className={styles.commentsList}
        /* TODO: Think of a better way to update the comments in the annotation list
         - for example polling the comment thread resource for annotations when the panel is open 
          and having the comment thread resource support annotation comments */
        onCommentsModified={onCommentsChanged}
      />
    </div>
  )
}
