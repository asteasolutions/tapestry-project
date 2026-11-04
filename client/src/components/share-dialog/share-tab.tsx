import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { GeneralAccess } from './general-access'
import { CollaboratorsAccess } from './collaborators-access'
import styles from './styles.module.css'
import { UserWithAccess, PeopleWithAccess } from './people-with-access'
import { ForkingPermissions } from './forking-permissions'
import { FeatureRequestSection } from './feature-request-section'
import { useState } from 'react'
import { useSession } from '../../layouts/session'

export interface ShareTabProps {
  tapestry: TapestryDto
  onMessage: (message: string) => void
  onViewAllWithAccess: (people: UserWithAccess[]) => unknown
}

export function ShareTab({
  tapestry: initialTapestry,
  onMessage,
  onViewAllWithAccess,
}: ShareTabProps) {
  const [tapestry, setTapestry] = useState(initialTapestry)
  const isOwner = useSession().user?.id === tapestry.ownerId

  return (
    <>
      <GeneralAccess
        tapestry={tapestry}
        onCopied={() => onMessage('Link copied to clipboard')}
        onUpdated={(updated) => setTapestry((current) => ({ ...current, ...updated }))}
      />
      {isOwner && (
        <>
          <hr className={styles.separator} />
          <FeatureRequestSection tapestry={tapestry} />
        </>
      )}
      <hr className={styles.separator} />
      <CollaboratorsAccess
        tapestry={tapestry}
        onCopied={() => onMessage('Invitation copied to clipboard')}
      />
      <PeopleWithAccess tapestry={tapestry} onViewAll={onViewAllWithAccess} />
      <hr className={styles.separator} />
      <ForkingPermissions tapestry={tapestry} />
    </>
  )
}
