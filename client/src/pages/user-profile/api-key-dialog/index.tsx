import { useRef, useState } from 'react'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { resource } from '../../../services/rest-resources'
import { UserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import styles from './styles.module.css'
import { uniqueId } from 'lodash-es'

interface ApiKeyDialogProps {
  user: UserDto
  onClose: () => void
  onSubmitted: () => void
}

export function ApiKeyDialog({ user, onClose, onSubmitted }: ApiKeyDialogProps) {
  const [form] = useState(() => uniqueId('form'))

  const apiKeyInputRef = useRef<HTMLInputElement>(null)

  const { perform: createUserSecret, loading: creating } = useAsyncAction(
    ({ signal }) =>
      resource('userSecrets').create(
        { ownerId: user.id, type: 'googleApiKey', value: apiKeyInputRef.current!.value },
        {},
        { signal },
      ),
    { onAfterAction: onSubmitted },
  )

  return (
    <SimpleModal
      classes={{ root: styles.addApiKeyDialog }}
      title="Add an API Key"
      cancel={{ onClick: onClose }}
      confirm={{ text: 'Save Key', disabled: creating, form }}
    >
      <form
        id={form}
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void createUserSecret()
        }}
      >
        <Text>This key is for your AI chats only and is securely stored.</Text>
        <Input
          label={<Text className={styles.labelText}>API Key *</Text>}
          className={styles.input}
          typography="body"
          placeholder="E.g. AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe"
          required
          minLength={3}
          ref={apiKeyInputRef}
        />
      </form>
    </SimpleModal>
  )
}
