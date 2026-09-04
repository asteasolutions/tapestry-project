import { useTapestryData } from '../../pages/tapestry/tapestry-providers'
import styles from './styles.module.css'
import { Avatar } from '../avatar'
import cursor from '../../assets/icons/cursor.svg?react'
import { ActiveCollaborator } from '../../pages/tapestry/view-model'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon'
import { idMapToArray } from 'tapestry-core/src/utils'
import { CURSOR_BROADCAST_PERIOD } from '../../stage/utils'
import { Viewport } from 'tapestry-core-client/src/view-model'
import { useRecentlyChanged } from 'tapestry-core-client/src/components/tapestry/hooks/use-recently-changed'

const MAX_INACTIVITY_PERIOD = 15_000

interface CollaboratorCursorProps {
  collaborator: ActiveCollaborator
  viewport: Viewport
}

function CollaboratorCursor({ collaborator, viewport }: CollaboratorCursorProps) {
  const hidden = !useRecentlyChanged(collaborator.cursorPosition, MAX_INACTIVITY_PERIOD)

  if (hidden) {
    return null
  }

  const {
    transform: { translation, scale },
  } = viewport

  return (
    <div
      className={styles.cursorContainer}
      style={{
        top: collaborator.cursorPosition.y * scale + translation.dy,
        left: collaborator.cursorPosition.x * scale + translation.dx,
        transition: `top ${CURSOR_BROADCAST_PERIOD}ms linear, left ${CURSOR_BROADCAST_PERIOD}ms linear`,
      }}
    >
      <SvgIcon Icon={cursor} fill={collaborator.color.toUpperCase()} />
      <Avatar
        className={styles.avatar}
        user={collaborator.userData}
        style={{ '--bg-color': collaborator.color } as React.CSSProperties}
      />
    </div>
  )
}

export function CollaboratorCursors() {
  const { collaborators, viewport, interactionMode } = useTapestryData([
    'collaborators',
    'viewport',
    'interactionMode',
  ])

  if (interactionMode !== 'edit') {
    return null
  }

  const visibleCollaborators = idMapToArray(collaborators).filter(
    (collaborator): collaborator is ActiveCollaborator => !!collaborator.cursorPosition,
  )

  return (
    <div className={styles.collaboratorsCursorsContainer} inert>
      {visibleCollaborators.map((collaborator) => (
        <CollaboratorCursor key={collaborator.id} collaborator={collaborator} viewport={viewport} />
      ))}
    </div>
  )
}
