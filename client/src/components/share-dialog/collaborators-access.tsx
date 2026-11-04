import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { resource } from '../../services/rest-resources'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { noop } from 'lodash-es'
import styles from './styles.module.css'
import { useSession } from '../../layouts/session'
import { useState } from 'react'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import clsx from 'clsx'

interface CollaboratorsAccessProps {
  tapestry: TapestryDto
  onCopied: () => unknown
}

export function CollaboratorsAccess({ tapestry, onCopied }: CollaboratorsAccessProps) {
  const { id } = tapestry
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const { data: invitationsResponse, reload } = useAsync(
    ({ signal }) =>
      resource('tapestryInvitations').list(
        { filter: { 'tapestryId:eq': id }, limit: 1 },
        { signal },
      ),
    [id],
    { clearDataOnReload: false },
  )

  const isOwner = useSession().user?.id === tapestry.ownerId

  const invitation = invitationsResponse?.data[0]

  const { perform: createInvitation } = useAsyncAction(({ signal }) =>
    resource('tapestryInvitations').create({ canEdit: true, tapestryId: id }, undefined, {
      signal,
    }),
  )

  async function regenerateInvitation() {
    await createInvitation()
    reload(noop)
  }

  const generateText = invitation ? 'Generate new link' : 'Generate link'
  const link = `${window.origin}?invitation=${invitation?.id}`

  return (
    <>
      <div className={styles.collaboratorHeader}>
        <div>
          <Text component="div" style={{ fontWeight: 600 }}>
            Invite others to edit
          </Text>
          <Text component="div" variant="bodyXs">
            You can share an invitation link that gives edit access.
          </Text>
        </div>
      </div>
      <div className={clsx(styles.embedCode, styles.shareLink)}>
        {!invitation && <div style={{ flex: 1 }} />}
        <Text
          variant="bodySm"
          className={clsx({ [styles.disabled]: !invitation })}
          style={{
            flex: 2,
            textAlign: invitation ? 'left' : 'center',
          }}
          lineClamp={2}
        >
          {invitation ? link : 'No invite link generated yet'}
        </Text>
        <div
          style={{ display: 'flex', flex: invitation ? 'initial' : 1, justifyContent: 'flex-end' }}
        >
          <IconButton
            aria-label="Copy invite link"
            tooltip={{ side: 'bottom', children: 'Copy invite link' }}
            icon="content_copy"
            disabled={!invitation?.id}
            onClick={async () => {
              await navigator.clipboard.writeText(link)
              onCopied()
            }}
          />
          {isOwner && (
            <IconButton
              aria-label={generateText}
              tooltip={{
                side: 'bottom',
                children: generateText,
                align: 'end',
                arrowFollowsAlignment: true,
              }}
              icon="settings"
              onClick={() =>
                invitation ? setShowConfirmationDialog(true) : regenerateInvitation()
              }
            />
          )}
        </div>
      </div>
      {showConfirmationDialog && (
        <SimpleModal
          classes={{ root: styles.regenerationConfirmationDialog }}
          title="Re-generate invitation link?"
          cancel={{ onClick: () => setShowConfirmationDialog(false) }}
          confirm={{
            text: 'Re-generate',
            onClick: async () => {
              setShowConfirmationDialog(false)
              await createInvitation()
              reload(noop)
            },
          }}
        >
          <Text>Creating a new invitation link will invalidate the existing one.</Text>
          <br />
          <br />
          <Text variant="bodyXs">
            People who have used the current invitation link to join your tapestry will continue to
            have access to the tapestry, but new people trying to join via this link will no longer
            be able to.
          </Text>
        </SimpleModal>
      )}
    </>
  )
}
