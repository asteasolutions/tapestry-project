import styles from './styles.module.css'
import { useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { Avatar } from '../avatar'
import { fullName } from '../../model/data/utils'
import { idMapToArray } from 'tapestry-core/src/utils'

export function CollaboratorIndicators() {
  const { collaborators, interactionMode } = useTapestryData(['collaborators', 'interactionMode'])
  if (interactionMode !== 'edit') {
    return null
  }
  return (
    <div className={styles.root}>
      {idMapToArray(collaborators).map((collaborator) => (
        <div key={collaborator.id} className={styles.collaboratorContainer}>
          <Avatar
            className={styles.avatar}
            user={collaborator.userData}
            tooltip={{ children: fullName(collaborator.userData), side: 'bottom' }}
            style={{ '--bg-color': collaborator.color } as React.CSSProperties}
          />
        </div>
      ))}
    </div>
  )
}
