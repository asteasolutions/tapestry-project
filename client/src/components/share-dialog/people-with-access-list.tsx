import { useState } from 'react'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { fullName } from '../../model/data/utils'
import { resource } from '../../services/rest-resources'
import { Avatar } from '../avatar'
import { UserWithAccess } from './people-with-access'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useSession } from '../../layouts/session'

interface PeopleWithAccessListProps {
  ownerId: string
  people: UserWithAccess[]
}

export function PeopleWithAccessList({ people, ownerId }: PeopleWithAccessListProps) {
  const [value, setValue] = useState(people)
  const isOwner = useSession().user?.id === ownerId
  const { trigger: removeAccess } = useAsyncAction(async ({ signal }, id: string) => {
    await resource('tapestryAccess').destroy({ id }, { signal })
    setValue((current) => current.filter((p) => p.accessId !== id))
  })

  return (
    <div className={styles.peopleWithAccessList}>
      {value.map((p) => (
        <div className={styles.peopleWithAccessListRow} key={p.id}>
          <div className={styles.peopleWithAccessListRowAvatarContainer}>
            <Avatar user={p} />
            <Text variant="bodyXs">{fullName(p)}</Text>
          </div>
          {p.id === ownerId ? (
            <Text
              variant="bodyXs"
              style={{ color: 'var(--theme-text-tertiary)', paddingRight: '4px' }}
            >
              Owner
            </Text>
          ) : (
            isOwner && (
              <IconButton
                aria-label="Remove access"
                onClick={() => removeAccess(p.accessId)}
                icon="close"
                size="small"
              />
            )
          )}
        </div>
      ))}
    </div>
  )
}
