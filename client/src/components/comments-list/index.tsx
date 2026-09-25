import { CommentDto } from 'tapestry-shared/src/data-transfer/resources/dtos/comment'
import { memo, useCallback, useState } from 'react'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import clsx from 'clsx'
import { MessageInput } from '../message-input'
import { resource } from '../../services/rest-resources'
import { LazyList } from '../lazy-list'
import { LazyListLoader, LazyListRequestItems } from '../lazy-list/lazy-list-loader'
import {
  useTapestryData,
  useTapestryDataSyncCommands,
} from '../../pages/tapestry/tapestry-providers'
import { Comment } from './comment'
import { LoadingLogoIcon } from '../loading-logo-icon'

export interface CommentsListProps {
  contextType: Exclude<CommentDto['contextType'], 'comment'>
  contextId: string
  className?: string
}

export const CommentsList = memo(({ contextType, contextId, className }: CommentsListProps) => {
  const { id: tapestryId, ownerId } = useTapestryData(['id', 'ownerId'])
  const { reloadCommentThreads } = useTapestryDataSyncCommands()
  const [commentsLoader, setCommentsLoader] = useState<LazyListLoader<CommentDto> | null>()
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)

  const loadComments = useCallback<LazyListRequestItems<CommentDto>>(
    (skip, limit, signal) =>
      resource('comments').list(
        {
          filter: {
            'tapestryId:eq': tapestryId,
            'contextType:eq': contextType,
            [`${contextType}Id:eq`]: contextId,
          },
          orderBy: '-createdAt',
          include: ['author'],
          skip,
          limit,
        },
        { signal },
      ),
    [tapestryId, contextType, contextId],
  )

  return (
    <div className={clsx(styles.root, className)}>
      <LazyList
        reversed
        key={contextId}
        onLoaderInitialized={setCommentsLoader}
        requestItems={loadComments}
        renderItem={(comment) => (
          <Comment
            comment={comment}
            tapestryAuthorId={ownerId}
            isEditing={editingCommentId === comment.id}
            setEditing={(value) => setEditingCommentId(value ? comment.id : null)}
            onDelete={() => {
              void commentsLoader?.reload()
              reloadCommentThreads()
              if (editingCommentId === comment.id) setEditingCommentId(null)
            }}
            onEdit={() => commentsLoader?.reload()}
          />
        )}
        emptyPlaceholder={
          <div className={styles.emptyPlaceholder}>
            <Text component="p" variant="bodySm">
              Be the first to write a comment!
            </Text>
          </div>
        }
        loadingIndicator={<LoadingLogoIcon className={styles.loadingIndicator} />}
        autoScrollFirstElements
      />
      <MessageInput
        placeholder="Add comment"
        onSubmit={async (text) => {
          await resource('comments').create({ tapestryId, contextType, contextId, text })
          void commentsLoader?.reload()
          reloadCommentThreads()
        }}
      />
    </div>
  )
})
