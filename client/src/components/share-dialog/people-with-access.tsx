import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { resource } from '../../services/rest-resources'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import { Avatar } from '../avatar'
import { PublicUserProfileDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { fullName } from '../../model/data/utils'
import { useSession } from '../../layouts/session'

function getNames(people: PublicUserProfileDto[], userId: string) {
  const others = people.filter((p) => p.id !== userId)
  if (others.length === 0) {
    return 'You'
  }

  if (others.length === 1) {
    return `You and ${fullName(others[0])}`
  }

  if (others.length === 2) {
    return `You, ${fullName(others[0])} and ${fullName(others[1])}`
  }

  return `You, ${fullName(others[0])}, ${fullName(others[1])} and ${others.length - 2} other(s)`
}

export interface UserWithAccess extends PublicUserProfileDto {
  canEdit: boolean
  accessId: string
}

interface PeopleWithAccessProps {
  tapestry: TapestryDto
  onViewAll: (people: UserWithAccess[]) => unknown
}

const MAX_AVATARS = 5

export function PeopleWithAccess({ tapestry, onViewAll }: PeopleWithAccessProps) {
  const { user } = useSession()
  const { id } = tapestry
  const { data } = useAsync(
    ({ signal }) =>
      resource('tapestryAccess').list(
        { filter: { 'tapestryId:eq': id }, include: ['user'] },
        { signal },
      ),
    [id],
  )
  const people = [
    tapestry.owner,
    ...(data?.data.map(({ user }) => user) ?? []),
  ] as PublicUserProfileDto[]

  return (
    <div className={styles.peopleWithAccess}>
      <Text component="div" style={{ fontWeight: 600 }}>
        {`People with Edit Privileges (${people.length})`}
      </Text>
      <div className={styles.peopleWithAccessContent}>
        <div className={styles.avatarsWrapper}>
          <div className={styles.avatarsContainer}>
            {people.slice(0, MAX_AVATARS).map((user) => (
              <Avatar user={user} key={user.id} />
            ))}
            {people.length > MAX_AVATARS && <Text>{`+${people.length - MAX_AVATARS}`}</Text>}
          </div>
          <Text variant="bodyXs">{getNames(people, user!.id)}</Text>
        </div>
        {people.length === 1 ? (
          <Text variant="bodyXs">Owner</Text>
        ) : (
          <IconButton
            icon="chevron_right"
            aria-label="List all people with access"
            onClick={() =>
              onViewAll(
                people.map((p) => {
                  const access = data!.data.find((access) => access.userId === p.id)
                  return {
                    ...p,
                    canEdit: p.id === tapestry.ownerId || !!access?.canEdit,
                    // Owner will be with accessId undefined, but that should be fine
                    accessId: access?.id as unknown as string,
                  }
                }),
              )
            }
          />
        )}
      </div>
    </div>
  )
}
