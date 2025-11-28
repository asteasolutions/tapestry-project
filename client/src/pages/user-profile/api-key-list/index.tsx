import {
  UserSecretDto,
  UserSecretType,
} from 'tapestry-shared/src/data-transfer/resources/dtos/user-secret'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import clsx from 'clsx'
import { resource } from '../../../services/rest-resources'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { useState } from 'react'

interface ApiKeyListProps {
  apiKeys: UserSecretDto[]
  className?: string
  onKeyDeleted?: () => void
}

const KEY_NAMES: Record<UserSecretType, string> = {
  googleApiKey: 'Gemini API key',
}

export function ApiKeyList({ apiKeys, className, onKeyDeleted }: ApiKeyListProps) {
  const [confirmDeletingKey, setConfirmDeletingKey] = useState<UserSecretDto | null>(null)

  const { perform: deleteUserSecret, loading: deleting } = useAsyncAction(
    ({ signal }, id: string) => resource('userSecrets').destroy({ id }, { signal }),
    {
      onAfterAction: () => {
        setConfirmDeletingKey(null)
        onKeyDeleted?.()
      },
    },
  )

  return (
    <>
      <div className={clsx(styles.root, className)}>
        {apiKeys.map((apiKey) => (
          <div className={styles.apiKey} key={apiKey.id}>
            <Text style={{ fontWeight: 600 }}>{KEY_NAMES[apiKey.type]}</Text>
            <Input className={styles.value} value={apiKey.maskedValue} disabled />
            <Button
              icon="delete"
              variant="outline-negative"
              onClick={() => setConfirmDeletingKey(apiKey)}
              disabled={deleting}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
      {confirmDeletingKey && (
        <SimpleModal
          title="Are you sure?"
          cancel={{ onClick: () => setConfirmDeletingKey(null) }}
          confirm={{
            text: 'Delete',
            variant: 'primary-negative',
            disabled: deleting,
            onClick: () => deleteUserSecret(confirmDeletingKey.id),
          }}
        >
          <Text>Are you sure you want to delete this {KEY_NAMES[confirmDeletingKey.type]}?</Text>
        </SimpleModal>
      )}
    </>
  )
}
