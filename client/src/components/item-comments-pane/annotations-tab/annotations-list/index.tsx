import styles from './styles.module.css'
import { LazyList } from '../../../lazy-list'
import { Text } from 'tapestry-core-client/src/components/lib/text'
import { CommentTextContent } from '../../../comments-list/comment'
import { Icon } from 'tapestry-core-client/src/components/lib/icon'
import { Avatar } from '../../../avatar'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'
import { TapestrySearchParams } from '../../../../pages/tapestry/view-model'
import clsx from 'clsx'
import { useNavigationState } from 'tapestry-core-client/src/components/tapestry/hooks/use-navigation-state'
import { AnnotationsListItem } from '..'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { useSession } from '../../../../layouts/session'
import { resource } from '../../../../services/rest-resources'
import {
  useTapestryData,
  useTapestryDataSyncCommands,
} from '../../../../pages/tapestry/tapestry-providers'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal'
import { useState } from 'react'

export interface AnnotationsListProps {
  annotations: AnnotationsListItem[]
  itemDto: ItemDto
  onOpenComments: (annotationId: string) => void
  onAnnotationFocus: (annotationId: string) => void
  onDelete: () => void
}

export function AnnotationsList({
  annotations,
  itemDto,
  onOpenComments,
  onAnnotationFocus,
  onDelete,
}: AnnotationsListProps) {
  const {
    params: { annotationId },
  } = useNavigationState<TapestrySearchParams>()

  const tapestryOwnerId = useTapestryData('ownerId')
  const { user } = useSession()
  const [pendingDeletionId, setPendingDeletionId] = useState<string>()

  const { reload: tapestryReload } = useTapestryDataSyncCommands()
  const { trigger: deleteAnnotation, loading: deletingAnnotation } = useAsyncAction(
    async ({ signal }, annotationId: string) => {
      await resource('annotations').destroy({ id: annotationId }, { signal })
      if (itemDto.type === 'text') {
        await new Promise((res) =>
          tapestryReload({ items: [itemDto.id] }, undefined, () => res(true)),
        )
      }
      onDelete()
    },
  )

  const itemId = itemDto.id

  return (
    <>
      <LazyList<AnnotationsListItem>
        key={itemId}
        autoReload={false}
        className={styles.root}
        requestItems={(skip, limit) =>
          Promise.resolve({
            data: annotations.slice(skip, skip + limit),
            total: annotations.length,
            skip,
          })
        }
        renderItem={({ data, id }) => (
          <div
            className={clsx(styles.annotationCard, { [styles.active]: annotationId === id })}
            tabIndex={0}
            role="button"
            onClick={(e) => {
              if (!(e.target instanceof HTMLElement && e.target.closest('button'))) {
                onAnnotationFocus(id)
              }
            }}
          >
            {data ? (
              <>
                <div className={styles.annotationPreview}>
                  {data.commentThread?.firstComment.deletedAt ? (
                    <Text component="div" variant="bodySm">
                      <em>[Deleted]</em>
                    </Text>
                  ) : (
                    <CommentTextContent text={data.commentThread?.firstComment.text ?? ''} />
                  )}
                  <div className={styles.commentThreadPreview}>
                    {(data.commentThread?.authors ?? []).map((author) => (
                      <Avatar user={author} size="small" key={author.id} />
                    ))}
                    <Button
                      className={styles.commentsCount}
                      typography="bodyXs"
                      variant="tertiary"
                      onClick={() => onOpenComments(data.id)}
                    >
                      <Icon icon="chat_bubble" size={12} />
                      {data.commentThread?.size} comment{data.commentThread?.size === 1 ? '' : 's'}
                    </Button>
                    {(data.authorId === user?.id || tapestryOwnerId === user?.id) && (
                      <Button
                        disabled={deletingAnnotation}
                        size="small"
                        icon="delete"
                        variant="tertiary-negative"
                        aria-label="Delete annotation"
                        onClick={() => setPendingDeletionId(data.id)}
                        tooltip={{ side: 'bottom', children: 'Delete' }}
                      />
                    )}
                  </div>
                </div>
                <Button
                  className={styles.commentsArrowButton}
                  variant="tertiary"
                  icon="chevron_right"
                  onClick={() => onOpenComments(data.id)}
                />
              </>
            ) : (
              <Text>MISSING ANNOTATION</Text>
            )}
          </div>
        )}
        emptyPlaceholder={
          <div className={styles.emptyPlaceholder}>
            <Text component="p" variant="bodySm">
              Select some text to add a comment
            </Text>
          </div>
        }
        loadingIndicator={null}
      />
      {pendingDeletionId && (
        <SimpleModal
          title="Delete annotation"
          cancel={{ onClick: () => setPendingDeletionId(undefined) }}
          confirm={{
            text: 'Delete',
            variant: 'primary-negative',
            disabled: deletingAnnotation,
            onClick: () => deleteAnnotation(pendingDeletionId),
          }}
        >
          <Text>Are you sure you want to delete this annotation?</Text>
        </SimpleModal>
      )}
    </>
  )
}
