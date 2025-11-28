import { useTapestryData } from '../../pages/tapestry/tapestry-providers'
import styles from './styles.module.css'
import { Avatar } from '../avatar'
import cursor from '../../assets/icons/cursor.svg?react'
import { ActiveCollaborator } from '../../pages/tapestry/view-model'
import { useEffect, useState } from 'react'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon'
import { idMapToArray } from 'tapestry-core/src/utils'
import { isEqual } from 'lodash'
import { CURSOR_BROADCAST_PERIOD } from '../../stage/utils'

const MAX_INACTIVITY_PERIOD = 15_000

interface CollaboratorCursorProps {
  collaborator: ActiveCollaborator
}

function CollaboratorCursor({ collaborator }: CollaboratorCursorProps) {
  const [prevCursorPosition, setPrevCursorPosition] = useState(collaborator.cursorPosition)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setHidden(true), MAX_INACTIVITY_PERIOD)
    return () => clearTimeout(timeout)
  }, [prevCursorPosition])

  if (!isEqual(prevCursorPosition, collaborator.cursorPosition)) {
    setPrevCursorPosition(collaborator.cursorPosition)
    setHidden(false)
  }

  if (hidden) {
    return null
  }

  return (
    <div
      className={styles.cursorContainer}
      style={{
        top: collaborator.cursorPosition.y,
        left: collaborator.cursorPosition.x,
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
  const {
    collaborators,
    viewport: {
      transform: { translation, scale },
    },
  } = useTapestryData(['collaborators', 'viewport'])

  const visibleCollaborators = idMapToArray(collaborators).filter(
    (collaborator): collaborator is ActiveCollaborator => !!collaborator.cursorPosition,
  )

  return (
    <div
      className={styles.collaboratorsCursorsContainer}
      style={{
        transform: `translate(${translation.dx}px, ${translation.dy}px) scale(${scale})`,
      }}
      inert
    >
      {visibleCollaborators.map((collaborator) => (
        <CollaboratorCursor key={collaborator.id} collaborator={collaborator} />
      ))}
    </div>
  )
}
