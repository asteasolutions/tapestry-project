import { useState } from 'react'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { auth } from '../..'
import { IAAuthService } from '../service'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import IALogo from '../../../assets/icons/ia-logo-circle-grey.svg?react'
import { APIError } from '../../../errors'
import { ErrorReason } from 'tapestry-shared/src/data-transfer/resources/dtos/errors'
import { uniqueId } from 'lodash'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import { Tooltip } from 'tapestry-core-client/src/components/lib/tooltip/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { Snackbar } from 'tapestry-core-client/src/components/lib/snackbar/index'

interface IALoginDialogProps {
  onClose: () => void
}

const REASON_MESSAGE_MAP: Record<ErrorReason, string> = {
  IAAccountNotAccessible: 'Internet Archive account not accessible',
  IANotAccessible: "Couldn't access the Internet Archive",
  InvalidIASession: 'Session expired',
}

export function IALoginDialog({ onClose }: IALoginDialogProps) {
  const [form] = useState(() => uniqueId('form'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [snackbarText, setSnackbarText] = useState<string>()

  const { trigger, cancel, loading } = useAsyncAction(async ({ signal }) => {
    try {
      const iaAuth = auth instanceof IAAuthService ? auth : null
      await iaAuth?.login({ authType: 'iaCredentials', email, password }, signal)
    } catch (error) {
      if (error instanceof APIError) {
        const { name, reason, message } = error.data
        if (name === 'InvalidCredentialsError') {
          setSnackbarText(reason ? REASON_MESSAGE_MAP[reason] : message)
        } else {
          setSnackbarText('Server error encountered')
        }
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
            <SvgIcon Icon={IALogo} size={32} style={{ display: 'block' }} />
            <Tooltip side="bottom" offset={8}>
              Internet Archive
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
      confirm={{ text: 'Log in', disabled: loading, form }}
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
          label={<Text className={styles.labelText}>Email address</Text>}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          minLength={3}
          className={styles.input}
          typography="body"
          autoFocus
          autoComplete="username"
        />
        <Input
          label={<Text className={styles.labelText}>Password</Text>}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          minLength={3}
          className={styles.input}
          typography="body"
          autoComplete="current-password"
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
