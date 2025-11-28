import clsx from 'clsx'
import { intlFormat, isEqual } from 'date-fns'
import styles from './styles.module.css'
import { typographyClassName } from 'tapestry-core-client/src/theme/index'
import { CommentDto } from 'tapestry-shared/src/data-transfer/resources/dtos/comment'
import { Avatar } from '../../avatar'
import { fullName } from '../../../model/data/utils'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useSession } from '../../../layouts/session'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useState } from 'react'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { resource } from '../../../services/rest-resources'
import { MessageInput } from '../../message-input'
import { useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { Tooltip } from 'tapestry-core-client/src/components/lib/tooltip/index'

interface CommentProps {
  comment: CommentDto
  tapestryAuthorId: string
  onDelete?: () => void
  onEdit?: (newComment: CommentDto) => void
}

function CommentContent({ createdAt, updatedAt, deletedAt, text }: CommentDto) {
  const lastUpdate = isEqual(updatedAt, createdAt) ? undefined : updatedAt
  return (
    <Text component="div" variant="bodySm" className={styles.commentText}>
      {deletedAt ? (
        <em>[Deleted]</em>
      ) : lastUpdate ? (
        <>
          {text}{' '}
          <Text variant="bodyXs" className={styles.editLabel}>
            (edited)
            <Tooltip side="top" offset={4}>
              {intlFormat(lastUpdate, {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: 'numeric',
              })}
            </Tooltip>
          </Text>
        </>
      ) : (
        text
      )}
    </Text>
  )
}

export function Comment({ comment, tapestryAuthorId, onDelete, onEdit }: CommentProps) {
  const { user } = useSession()

  const isDeleted = !!comment.deletedAt
  const isAuthor = comment.authorId === user?.id
  const canEditTapestry = useTapestryData('userAccess') === 'edit'
  const canModify = !isDeleted && (isAuthor || canEditTapestry)

  const { id } = comment

  const [showEditControls, setShowEditControls] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { trigger: deleteComment, loading: deleteInProgress } = useAsyncAction(
    async ({ signal }) => {
      await resource('comments').destroy({ id }, { signal })
      setDeleting(false)
      onDelete?.()
    },
  )

  const { trigger: editComment } = useAsyncAction(async ({ signal }, text: string) => {
    const newComment = await resource('comments').update({ id }, { text }, undefined, { signal })
    setEditing(false)
    onEdit?.(newComment)
  })

  const showingEditControls = showEditControls && canModify

  return (
    <div
      onMouseOver={() => setShowEditControls(true)}
      onMouseOut={() => setShowEditControls(false)}
    >
      <div className={clsx(styles.commentHeader, typographyClassName('bodyXs'))}>
        <Avatar size="small" user={comment.author!} />
        <span className={styles.commentAuthor}>{fullName(comment.author!)}</span>
        {tapestryAuthorId === comment.authorId && <span className={styles.authorChip}>Author</span>}
        <span style={{ flex: 1 }} />
        {showingEditControls ? (
          <div className={styles.buttonsContainer}>
            {isAuthor && (
              <IconButton
                size="small"
                icon="edit"
                aria-label="Edit comment"
                onClick={() => setEditing(!editing)}
                tooltip={{ side: 'bottom', children: 'Edit' }}
              />
            )}
            <IconButton
              size="small"
              icon="delete"
              aria-label="Delete comment"
              onClick={() => setDeleting(true)}
              tooltip={{ side: 'bottom', children: 'Delete' }}
            />
          </div>
        ) : (
          <span className={styles.commentDate}>
            {intlFormat(comment.createdAt, {
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: 'numeric',
            })}
          </span>
        )}
      </div>
      {editing ? (
        <MessageInput onSubmit={editComment} className={styles.editComment} value={comment.text} />
      ) : (
        <CommentContent {...comment} />
      )}
      {deleting && (
        <SimpleModal
          title="Delete comment"
          cancel={{ onClick: () => setDeleting(false) }}
          confirm={{
            text: 'Delete',
            variant: 'primary-negative',
            disabled: deleteInProgress,
            onClick: deleteComment,
          }}
        >
          <Text>Are you sure you want to delete this comment?</Text>
        </SimpleModal>
      )}
    </div>
  )
}
