import styles from './styles.module.css'
import { LoginButton } from '../../auth'
import { PromptDialog } from '../prompt-dialog'
import { useSession } from '../../layouts/session'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { resource } from '../../services/rest-resources'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useState } from 'react'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { fullName } from '../../model/data/utils'
import { tapestryPath } from '../../utils/paths'
import { APIError } from '../../errors'

function parseErrorMessage(error: unknown) {
  if (!error) {
    return null
  }
  return error instanceof APIError ? error.message : 'Something went wrong'
}

export function AcceptInvitationDialog() {
  const { user } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showDialog, setShowDialog] = useState(false)
  const navigate = useNavigate()

  const { data } = useAsync(
    async ({ signal }) => {
      const invitationId = new URL(location.href).searchParams.get('invitation')
      if (!invitationId) {
        return
      }
      if (!user?.id) {
        setShowDialog(true)
        return
      }
      const invitation = await resource('tapestryInvitations').read(
        { id: invitationId },
        { include: ['tapestry.owner', 'tapestry.userAccess'] },
        { signal },
      )

      setShowDialog(true)

      return invitation
    },
    [user?.id],
  )

  const { trigger: accept, error } = useAsyncAction(
    async ({ signal }, tapestryInvitationId: string) => {
      await resource('tapestryAccess').create({ tapestryInvitationId }, undefined, { signal })
      searchParams.delete('invitation')
      setSearchParams(searchParams, { replace: true })
      setShowDialog(false)
      const tapestry = await resource('tapestries').read(
        { id: data!.tapestryId },
        { include: ['owner'] },
        { signal },
      )
      void navigate(tapestryPath(tapestry.owner!.username, tapestry.slug, 'edit'))
    },
  )

  if (!showDialog) {
    return null
  }

  function getContent() {
    if (!user || !data) {
      return {
        title: 'You have been invited!',
        subtitle: 'You need to login in order to accept the invitation',
        content: <LoginButton />,
      }
    }

    const hasAccess =
      !!data.tapestry?.userAccess?.find((access) => access.userId === user.id) ||
      data.tapestry?.ownerId === user.id
    if (hasAccess) {
      return {
        title: 'You have access!',
        subtitle: (
          <>
            You already have access to <em>{data.tapestry?.title}</em>.<br />
            Click the button below to open it.
          </>
        ),
        content: (
          <Button
            component={Link}
            to={tapestryPath(data.tapestry!.owner!.username, data.tapestry!.slug, 'edit')}
          >
            Open
          </Button>
        ),
      }
    }

    const errorMessage = parseErrorMessage(error)

    return {
      title: 'You have been invited!',
      subtitle: (
        <>
          You have been invited to collaborate on tapestry <em>{data.tapestry!.title}</em> owned by{' '}
          <em>{fullName(data.tapestry!.owner!)}</em>
        </>
      ),
      content: (
        <div className={styles.acceptContainer}>
          <Text component="div" variant="bodySm" style={{ textAlign: 'center' }}>
            You are logged in as <em>{user.email}</em>.<br />
            Do you want to accept the invitation?
          </Text>
          <Button onClick={() => accept(data.id)}>Accept and open</Button>
          {errorMessage && <Text textType="error">{errorMessage}</Text>}
        </div>
      ),
    }
  }

  const { title, subtitle, content } = getContent()

  return (
    <PromptDialog
      title={title}
      subtitle={<div className={styles.subtitle}>{subtitle}</div>}
      onClose={() => setShowDialog(false)}
    >
      {content}
    </PromptDialog>
  )
}
