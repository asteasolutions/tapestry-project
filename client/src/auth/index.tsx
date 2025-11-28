import { ComponentType, createElement, useState } from 'react'
import { config } from '../config'
import { AuthService } from '../services/auth'
import { GoogleAuthService } from './google/service'
import { IAAuthService } from './internet-archive/service'
import { IALoginButton } from './internet-archive/login-button'
import { GoogleLoginButton } from './google/login-button'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { uniqueId } from 'lodash'
import { getErrorMessage } from '../errors'

type ProviderName = typeof config.authProvider

const AUTH_SERVICES: Record<ProviderName, new () => AuthService> = {
  ia: IAAuthService,
  google: GoogleAuthService,
}

const LOGIN_BUTTONS: Record<ProviderName, ComponentType<LoginButtonProps>> = {
  ia: IALoginButton,
  google: GoogleLoginButton,
}

interface RegistrationModalProps {
  initialName: string
}

function RegistrationModal({ initialName }: RegistrationModalProps) {
  const [form] = useState(() => uniqueId('form'))
  const [username, setUsername] = useState(initialName)

  const { error, trigger, loading } = useAsyncAction(({ signal }) =>
    auth.register(username, signal),
  )

  return (
    <SimpleModal
      title="Welcome to Tapestries"
      cancel={{
        onClick: () => auth.cancelRegistration(),
      }}
      confirm={{ form, text: 'Register', disabled: loading || !username }}
    >
      <form
        id={form}
        onSubmit={(e) => {
          e.preventDefault()
          trigger()
        }}
      >
        <Input
          label={<Text>Please choose a username</Text>}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={getErrorMessage(error, 'username', {
            invalid: 'Username can only include letters, digits, +, -, . and _',
          })}
          name="username"
        />
      </form>
    </SimpleModal>
  )
}

interface LoginButtonProps {
  className?: string
}

export const auth = new AUTH_SERVICES[config.authProvider]()
export function LoginButton() {
  const { pendingRegistration } = useObservable(auth)

  return (
    <>
      {createElement(LOGIN_BUTTONS[config.authProvider])}
      {pendingRegistration && (
        <RegistrationModal initialName={pendingRegistration.usernameSuggestion} />
      )}
    </>
  )
}
