import { useState } from 'react'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { resource } from '../../services/rest-resources'
import { LoadingIndicator } from '../loading-indicator'
import { Modal } from 'tapestry-core-client/src/components/lib/modal/index'
import { TabPanel } from 'tapestry-core-client/src/components/lib/tab-panel/index'
import styles from './styles.module.css'
import { ShareTab } from './share-tab'
import { EmbedTab } from './embed-tab'
import { UserWithAccess } from './people-with-access'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { PeopleWithAccessList } from './people-with-access-list'
import { Snackbar } from 'tapestry-core-client/src/components/lib/snackbar/index'

export interface ShareDialogProps {
  tapestryId: string
  onClose: () => unknown
}

export function ShareDialog({ tapestryId, onClose }: ShareDialogProps) {
  const [selectedTab, setSelectedTab] = useState<'share' | 'embed' | null>(null)
  const [peopleWithAccess, setPeopleWithAccess] = useState<UserWithAccess[]>()
  const [snackbarText, setSnackbarText] = useState<string>()

  const { data: tapestry, loading } = useAsync(
    ({ signal }) =>
      resource('tapestries').read({ id: tapestryId }, { include: ['owner'] }, { signal }),
    [tapestryId],
  )

  if (tapestry && !selectedTab) {
    setSelectedTab('share')
  }

  return (
    <Modal
      title={
        peopleWithAccess ? (
          <div className={styles.peopleWithAccessTitle}>
            <IconButton
              onClick={() => setPeopleWithAccess(undefined)}
              aria-label="Go back"
              icon="arrow_back"
            />
            <Text variant="h6">People with access</Text>
          </div>
        ) : (
          `Share "${tapestry?.title}"`
        )
      }
      onClose={onClose}
      classes={{ root: styles.root }}
    >
      {!peopleWithAccess && (
        <TabPanel
          tabs={{ share: 'Share', embed: 'Embed' }}
          selected={selectedTab}
          onSelect={setSelectedTab}
        />
      )}
      <div className={styles.content}>
        {peopleWithAccess ? (
          <PeopleWithAccessList people={peopleWithAccess} ownerId={tapestry!.ownerId} />
        ) : loading || !tapestry ? (
          <LoadingIndicator className={styles.loading} />
        ) : (
          <>
            {selectedTab === 'share' && (
              <ShareTab
                tapestry={tapestry}
                onMessage={setSnackbarText}
                onViewAllWithAccess={setPeopleWithAccess}
              />
            )}
            {selectedTab === 'embed' && (
              <EmbedTab tapestry={tapestry} onMessage={setSnackbarText} />
            )}
          </>
        )}
      </div>
      <Snackbar
        value={snackbarText ? { text: snackbarText } : undefined}
        onChange={() => setSnackbarText(undefined)}
      />
    </Modal>
  )
}
