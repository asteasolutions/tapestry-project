import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { GeneralAccess } from './general-access'
import { CollaboratorsAccess } from './collaborators-access'
import styles from './styles.module.css'
import { UserWithAccess, PeopleWithAccess } from './people-with-access'
import { ForkingPermissions } from './forking-permissions'

export interface ShareTabProps {
  tapestry: TapestryDto
  onMessage: (message: string) => void
  onViewAllWithAccess: (people: UserWithAccess[]) => unknown
}

export function ShareTab({ tapestry, onMessage, onViewAllWithAccess }: ShareTabProps) {
  return (
    <>
      <GeneralAccess tapestry={tapestry} onCopied={() => onMessage('Link copied to clipboard')} />
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
