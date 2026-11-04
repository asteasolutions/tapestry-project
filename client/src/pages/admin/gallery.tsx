import { useState } from 'react'
import { noop } from 'lodash-es'
import clsx from 'clsx'
import { Link } from 'react-router'
import { Button, IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { AdminTapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { listAll, resource } from '../../services/rest-resources'
import { adminPath, dashboardPath, tapestryPath } from '../../utils/paths'
import { ErrorText, SectionHeader } from './components'
import { formatDate } from './format'
import styles from './styles.module.css'

function move<T>(list: T[], from: number, to: number) {
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function AdminGallery() {
  const [order, setOrder] = useState<AdminTapestryDto[]>()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>()
  const [announcement, setAnnouncement] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [removing, setRemoving] = useState<AdminTapestryDto | null>(null)

  const { data, error, reload } = useAsync(
    ({ signal }) =>
      listAll(
        resource('adminTapestries'),
        { filter: { 'featured:eq': 'true' }, orderBy: 'galleryPosition' },
        signal,
      ),
    [],
    { clearDataOnReload: false },
  )
  const [prevData, setPrevData] = useState(data)
  if (data !== prevData) {
    setPrevData(data)
    setOrder(data)
  }

  async function saveOrder(next: AdminTapestryDto[], message: string) {
    const previous = order
    setOrder(next)
    setSaving(true)
    setSaveError(undefined)
    try {
      await resource('adminActivity').create({
        action: 'reorderGallery',
        tapestryIds: next.map((t) => t.id),
      })
      setAnnouncement(message)
    } catch (e) {
      setSaveError(e)
      setOrder(previous)
      // The Gallery may have been changed by somebody else, so reload it
      reload(noop)
    } finally {
      setSaving(false)
    }
  }

  function moveTo(from: number, to: number) {
    if (!order || to < 0 || to >= order.length || from === to) return
    const tapestry = order[from]
    void saveOrder(move(order, from, to), `${tapestry.title} moved to position ${to + 1}`)
  }

  return (
    <>
      <SectionHeader
        title="Gallery"
        description="Featured tapestries in the order they appear in the public Gallery. Drag a tapestry, or use the arrow buttons, to change the order. Changes are saved immediately."
        actions={
          <Button
            variant="secondary"
            component="a"
            href={dashboardPath('public')}
            target="_blank"
            icon="open_in_new"
          >
            View Gallery
          </Button>
        }
      />
      <ErrorText error={error ?? saveError} />
      <div aria-live="polite" className={styles.visuallyHidden}>
        {saving ? 'Saving the Gallery order…' : announcement}
      </div>
      {order?.length === 0 && (
        <Text className={styles.muted}>
          No tapestries are featured yet. Feature a tapestry from the{' '}
          <Link to={adminPath('tapestries')}>tapestry list</Link> or approve a{' '}
          <Link to={adminPath('feature-requests')}>feature request</Link>.
        </Text>
      )}
      <ol className={styles.galleryList} aria-label="Gallery order">
        {order?.map((tapestry, index) => (
          <li
            key={tapestry.id}
            className={clsx(styles.galleryItem, {
              [styles.dragging]: dragIndex === index,
              [styles.dropTarget]: dropIndex === index && dragIndex !== index,
            })}
            draggable={!saving}
            onDragStart={(e) => {
              setDragIndex(index)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', tapestry.id)
            }}
            onDragOver={(e) => {
              if (dragIndex === null) return
              e.preventDefault()
              setDropIndex(index)
            }}
            onDragLeave={() => setDropIndex((current) => (current === index ? null : current))}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIndex !== null) moveTo(dragIndex, index)
              setDragIndex(null)
              setDropIndex(null)
            }}
            onDragEnd={() => {
              setDragIndex(null)
              setDropIndex(null)
            }}
          >
            <Icon icon="drag_indicator" className={styles.dragHandle} aria-hidden />
            <span className={styles.position}>{index + 1}</span>
            {tapestry.thumbnail ? (
              <img src={tapestry.thumbnail} alt="" className={styles.thumbnail} />
            ) : (
              <span className={styles.thumbnail} />
            )}
            <div className={styles.galleryTitle}>
              <Text component="div">
                <Link to={adminPath('tapestries', tapestry.id)}>{tapestry.title}</Link>
              </Text>
              <Text variant="bodyXs" component="div" className={styles.muted}>
                by {tapestry.owner.username} · featured {formatDate(tapestry.featuredAt)} ·{' '}
                <a
                  href={tapestryPath(tapestry.owner.username, tapestry.slug)}
                  target="_blank"
                  rel="noreferrer"
                >
                  open
                </a>
              </Text>
            </div>
            <IconButton
              icon="arrow_upward"
              aria-label={`Move ${tapestry.title} up`}
              disabled={saving || index === 0}
              onClick={() => moveTo(index, index - 1)}
            />
            <IconButton
              icon="arrow_downward"
              aria-label={`Move ${tapestry.title} down`}
              disabled={saving || index === order.length - 1}
              onClick={() => moveTo(index, index + 1)}
            />
            <Button
              variant="tertiary-negative"
              size="small"
              disabled={saving}
              onClick={() => setRemoving(tapestry)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ol>
      {removing && (
        <SimpleModal
          title="Remove from the Gallery?"
          cancel={{ onClick: () => setRemoving(null) }}
          confirm={{
            text: 'Remove',
            variant: 'primary-negative',
            onClick: async () => {
              const tapestry = removing
              setRemoving(null)
              setSaveError(undefined)
              try {
                await resource('adminTapestries').update({ id: tapestry.id }, { featured: false })
                setOrder((current) => current?.filter((t) => t.id !== tapestry.id))
                setAnnouncement(`${tapestry.title} removed from the Gallery`)
              } catch (e) {
                setSaveError(e)
              }
            },
          }}
        >
          <Text component="p">
            “{removing.title}” will no longer be featured. It stays shared with anyone with the
            link.
          </Text>
        </SimpleModal>
      )}
    </>
  )
}
