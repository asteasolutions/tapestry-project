import styles from './styles.module.css'
import { MessageInput } from '../../message-input'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { resource } from '../../../services/rest-resources'
import {
  useDispatch,
  useTapestryData,
  useTapestryDataSyncCommands,
} from '../../../pages/tapestry/tapestry-providers'
import { AnnotationCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/annotation'
import { setPendingAnnotation } from '../../../pages/tapestry/view-model/store-commands/tapestry'
import { Text } from 'tapestry-core-client/src/components/lib/text'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'

interface AnnotationCommentInputProps {
  pendingAnnotation: AnnotationCreateDto
  onCreate: (annotationId: string) => void
  onError: (err: unknown) => void
}

export function AnnotationCommentInput({
  pendingAnnotation,
  onCreate,
  onError,
}: AnnotationCommentInputProps) {
  const dispatch = useDispatch()
  const tapestryId = useTapestryData('id')
  const { reload } = useTapestryDataSyncCommands()

  const { trigger: createAnnotation, loading } = useAsyncAction(
    async ({ signal }, commentText: string) => {
      try {
        const newAnnotation = await resource('annotations').create(pendingAnnotation, undefined, {
          signal,
        })

        await resource('comments').create({
          tapestryId,
          contextType: 'itemAnnotation',
          contextId: newAnnotation.id,
          text: commentText,
        })
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (pendingAnnotation.annotationType === 'text') {
          await new Promise((res) =>
            reload({ items: [pendingAnnotation.itemId] }, undefined, () => res(true)),
          )
        }

        onCreate(newAnnotation.id)
      } catch (err) {
        onError(err)
      }
    },
  )

  return (
    <div className={styles.root}>
      <div className={styles.meta}>
        <Text variant="bodySm">Commenting on selection</Text>
        <Button
          variant="tertiary"
          size="small"
          className={styles.cancelButton}
          disabled={loading}
          onClick={() => dispatch(setPendingAnnotation(null))}
        >
          Cancel
        </Button>
      </div>
      <MessageInput
        onSubmit={createAnnotation}
        disabled={loading}
        className={styles.commentInput}
      />
    </div>
  )
}
