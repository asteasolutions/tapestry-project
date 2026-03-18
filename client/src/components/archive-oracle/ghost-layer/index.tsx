import { intlFormat } from 'date-fns'
import { useMemo, useState } from 'react'
import { cssTransformForLocation, DOM_CONTAINER_CLASS } from 'tapestry-core-client/src/stage/utils'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { createIAMediaItems } from '../../../stage/item-factories'
import { addAndPositionItems } from '../../../pages/tapestry/view-model/store-commands/items'
import { createItemViewModel } from '../../../pages/tapestry/view-model/utils'
import { updateArchiveOracle } from '../../../pages/tapestry/view-model/store-commands/archive-oracle'
import styles from './styles.module.css'

function iaDetailsURL(identifier: string) {
  return `https://archive.org/details/${identifier}`
}

function formatType(mediatype: string) {
  if (mediatype === 'texts') return 'Book / Text'
  if (mediatype === 'audio') return 'Audio'
  if (mediatype === 'movies') return 'Video'
  return mediatype
}

export function ArchiveOracleGhostLayer() {
  const dispatch = useDispatch()
  const { archiveOracle, viewport, id: tapestryId, interactionMode } = useTapestryData([
    'archiveOracle',
    'viewport',
    'id',
    'interactionMode',
  ])

  const [solidifyingKey, setSolidifyingKey] = useState<string | null>(null)

  const isEditMode = interactionMode === 'edit'
  const transform = viewport.transform

  const ghosts = useMemo(
    () => (archiveOracle.enabled ? archiveOracle.ghosts : []),
    [archiveOracle.enabled, archiveOracle.ghosts],
  )


  const canShow = isEditMode && ghosts.length > 0

  const positions = useMemo(
    () =>
      ghosts.map((g) => ({
        key: g.key,
        style: {
          position: 'absolute',
          top: `${g.position.y}px`,
          left: `${g.position.x}px`,
          ...cssTransformForLocation({ x: g.position.x, y: g.position.y }, transform),
        } as React.CSSProperties,
      })),
    [ghosts, transform],
  )

  if (!canShow) {
    return null
  }

  return (
    <div className={styles.layer}>
      {ghosts.map((ghost, idx) => {
        const doc = ghost.doc
        const disabled = solidifyingKey === ghost.key
        return (
          <div
            key={ghost.key}
            style={positions[idx]?.style}
            className={`${DOM_CONTAINER_CLASS} ${styles.ghost}`}
            data-ui-component="archiveOracleGhost"
            aria-label="Archive Oracle suggestion"
          >
            <div className={styles['title-row']}>
              <div className={styles.title} title={doc.title}>
                {doc.title}
              </div>
            </div>
            <div className={styles.meta}>
              {formatType(doc.mediatype)}
              {doc.creator ? ` • ${doc.creator}` : ''}
              {' • '}
              {intlFormat(doc.publicdate, { year: 'numeric' })}
            </div>
            <div className={styles.actions}>
              <button
                className={`${styles.button} ${styles['button-primary']}`}
                disabled={disabled}
                onClick={async () => {
                  try {
                    setSolidifyingKey(ghost.key)
                    const items = await createIAMediaItems(tapestryId, [
                      { id: doc.identifier, mediaType: doc.mediatype },
                    ])
                    const viewModels = items.map(createItemViewModel)
                    dispatch(
                      addAndPositionItems(viewModels, {
                        centerAt: ghost.position,
                        coordinateSystem: 'tapestry',
                      }),
                      updateArchiveOracle({ ghosts: ghosts.filter((g) => g.key !== ghost.key) }),
                    )
                  } finally {
                    setSolidifyingKey(null)
                  }
                }}
              >
                Solidify
              </button>
              <button
                className={styles.button}
                disabled={disabled}
                onClick={() => window.open(iaDetailsURL(doc.identifier), '_blank', 'noopener,noreferrer')}
              >
                Open
              </button>
              <button
                className={styles.button}
                disabled={disabled}
                onClick={() =>
                  dispatch(
                    updateArchiveOracle({ ghosts: ghosts.filter((g) => g.key !== ghost.key) }),
                  )
                }
              >
                Dismiss
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
