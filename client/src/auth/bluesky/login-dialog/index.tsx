import { useState } from 'react'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import BlueskyLogo from '../../../assets/icons/bluesky-logo.svg?react'
import { uniqueId } from 'lodash-es'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import { Tooltip } from 'tapestry-core-client/src/components/lib/tooltip/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { Snackbar } from 'tapestry-core-client/src/components/lib/snackbar/index'
import { startBlueskyLogin, saveBlueskyReturnTo } from '../oauth-client'
import { OAuthResolverError } from '@atproto/oauth-client-browser'

interface BlueskyLoginDialogProps {
  onClose: () => void
}

export function BlueskyLoginDialog({ onClose }: BlueskyLoginDialogProps) {
  const [form] = useState(() => uniqueId('form'))
  const [handle, setHandle] = useState('')
  const [snackbarText, setSnackbarText] = useState<string>()

  const { trigger, cancel, loading } = useAsyncAction(async ({ signal }) => {
    try {
      saveBlueskyReturnTo()
      await startBlueskyLogin(handle.trim().replace(/^@/, ''), signal)
    } catch (error) {
      if (error instanceof OAuthResolverError) {
        setSnackbarText("Couldn't find a Bluesky account with this handle")
      } else {
        setSnackbarText('Unknown error encountered')
      }
      throw error
    }
  })

  return (
    <SimpleModal
      title={
        <Text variant="h6" className={styles.header}>
          <div className={styles.withTooltip}>
            <SvgIcon Icon={BlueskyLogo} size={32} style={{ display: 'block' }} />
            <Tooltip side="bottom" offset={8}>
              Bluesky
            </Tooltip>
          </div>
          Log In
        </Text>
      }
      cancel={{
        onClick: () => {
          cancel()
          onClose()
        },
      }}
      confirm={{ text: 'Continue', disabled: loading || !handle.trim(), form }}
      classes={{ root: styles.modal }}
    >
      <form
        id={form}
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          trigger()
        }}
      >
        <Input
          label={<Text className={styles.labelText}>Bluesky handle</Text>}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="alice.bsky.social"
          className={styles.input}
          typography="body"
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
        />
        <input type="submit" hidden />
      </form>
      <Snackbar
        value={snackbarText ? { text: snackbarText, variant: 'error' } : undefined}
        onChange={() => setSnackbarText(undefined)}
      />
    </SimpleModal>
  )
}
