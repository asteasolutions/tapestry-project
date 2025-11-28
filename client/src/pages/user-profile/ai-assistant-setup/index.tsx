import { UserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { resource } from '../../../services/rest-resources'
import { LoadingLogoIcon } from '../../../components/loading-logo-icon'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useState } from 'react'
import { noop } from 'lodash'
import { ApiKeyDialog } from '../api-key-dialog'
import { ApiKeyList } from '../api-key-list'

interface AIAssistantSetupProps {
  user: UserDto
}

export function AIAssistantSetup({ user }: AIAssistantSetupProps) {
  const [isAdding, setIsAdding] = useState(false)

  const {
    data: secrets,
    loading,
    reload,
  } = useAsync(
    ({ signal }) =>
      resource('userSecrets').list(
        { filter: { 'ownerId:eq': user.id }, orderBy: '-createdAt', limit: 100 },
        { signal },
      ),
    [user.id],
  )

  function openDialog() {
    setIsAdding(true)
  }

  function closeDialog() {
    setIsAdding(false)
  }

  return (
    <div className={styles.root}>
      {loading && <LoadingLogoIcon className={styles.loadingIndicator} />}
      {!loading && !secrets?.data.length && (
        <div className={styles.emptyPlaceholder}>
          <Text variant="h4" className={styles.emptyMessage}>
            No API Keys found
          </Text>
          <Button icon="add" onClick={openDialog}>
            Add new
          </Button>
        </div>
      )}
      {!loading && secrets?.data.length && (
        <div className={styles.content}>
          <Text variant="h6" style={{ fontWeight: 500 }}>
            Manage your API keys
          </Text>
          <div>
            <Text component="div" className={styles.termsMessage}>
              We store your API keys securely and use them only for your personal AI interactions.
            </Text>
            <div className={styles.apiKeyListContainer}>
              <ApiKeyList
                apiKeys={secrets.data}
                className={styles.apiKeyList}
                onKeyDeleted={() => reload(noop)}
              />
              <div className={styles.buttons}>
                {/* Currently a user can have at most one Gemini API key. Once we start supporting other AI providers,
                users will be able to add more keys. */}
                <Button icon="add" onClick={openDialog} disabled>
                  Add new key
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isAdding && (
        <ApiKeyDialog
          user={user}
          onClose={closeDialog}
          onSubmitted={() => {
            closeDialog()
            reload(noop)
          }}
        />
      )}
    </div>
  )
}
