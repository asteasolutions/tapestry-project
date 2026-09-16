import { useState } from 'react'
import { AuthService } from '../services/auth' // или точния път до сервиза
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { uniqueId } from 'lodash-es'
import { getErrorMessage } from '../errors'
import { LoginMenu } from '../components/auth-dialog'

export const auth = new AuthService()

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

export function LoginButton() {
  const { pendingRegistration } = useObservable(auth)

  return (
    <>
      <LoginMenu />
      {pendingRegistration && (
        <RegistrationModal initialName={pendingRegistration.usernameSuggestion} />
      )}
    </>
  )
}
