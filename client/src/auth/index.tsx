import { useState } from 'react'
import { AuthService } from '../services/auth'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { uniqueId } from 'lodash-es'
import { getErrorMessage } from '../errors'
import { LoginMenu } from '../components/auth-dialog'
import { AUTH_PROVIDERS } from './providers-registry'

export const auth = new AuthService()

interface RegistrationModalProps {
  initialUsername: string
  initialFirstName?: string
  initialLastName?: string
}

interface FormDataState {
  username: string
  firstName: string
  lastName: string
}

function RegistrationModal({
  initialUsername,
  initialFirstName = '',
  initialLastName = '',
}: RegistrationModalProps) {
  const [form] = useState(() => uniqueId('form'))
  const [formData, setFormData] = useState<FormDataState>({
    username: initialUsername,
    firstName: initialFirstName,
    lastName: initialLastName,
  })

  const { error, trigger, loading } = useAsyncAction(({ signal }) =>
    auth.register(
      {
        username: formData.username.trim(),
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
      },
      signal,
    ),
  )

  const handleInputChange = (changes: Partial<FormDataState>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...changes }

      if (changes.firstName !== undefined && !changes.firstName.trim()) {
        updated.lastName = ''
      }

      return updated
    })
  }

  return (
    <SimpleModal
      title="Welcome to Tapestries"
      cancel={{
        onClick: () => auth.cancelRegistration(),
      }}
      confirm={{ form, text: 'Register', disabled: loading || !formData.username.trim() }}
    >
      <form
        id={form}
        onSubmit={(e) => {
          e.preventDefault()
          trigger()
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <Input
          label={<Text>Please choose a username</Text>}
          value={formData.username}
          onChange={(e) => handleInputChange({ username: e.target.value })}
          error={getErrorMessage(error, 'username', {
            invalid: 'Username can only include letters, digits, +, -, . and _',
          })}
          name="username"
        />
        <Input
          label={<Text>First name (optional)</Text>}
          value={formData.firstName}
          onChange={(e) => handleInputChange({ firstName: e.target.value })}
          error={getErrorMessage(error, 'firstName')}
          name="firstName"
        />

        <Input
          label={<Text>Last name (optional)</Text>}
          value={formData.lastName}
          onChange={(e) => handleInputChange({ lastName: e.target.value })}
          disabled={!formData.firstName.trim()}
          error={getErrorMessage(error, 'lastName')}
          name="lastName"
        />
      </form>
    </SimpleModal>
  )
}

export function LoginButton() {
  const { pendingRegistration } = useObservable(auth)

  const isSingleProvider = AUTH_PROVIDERS.length === 1
  const SingleProviderComponent = AUTH_PROVIDERS.length === 1 ? AUTH_PROVIDERS[0].component : null

  return (
    <>
      {SingleProviderComponent ? (
        <SingleProviderComponent isSingleProvider={isSingleProvider} />
      ) : (
        <LoginMenu />
      )}
      {pendingRegistration && (
        <RegistrationModal
          initialUsername={pendingRegistration.usernameSuggestion}
          initialFirstName={pendingRegistration.firstNameSuggestion}
          initialLastName={pendingRegistration.lastNameSuggestion}
        />
      )}
    </>
  )
}
