import { useState } from 'react'
import { noop } from 'lodash-es'
import { Link } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { listAll, resource } from '../../../services/rest-resources'
import { adminPath, dashboardPath } from '../../../utils/paths'
import { APIError } from '../../../errors'
import { PageHeader } from '../components/page-header'
import { Notice, NoticeButton } from '../components/notice'
import { ErrorText } from '../components/error-text'
import { pluralize } from '../format'
import { GalleryCard, RemovedGalleryCard } from './gallery-card'
import common from '../common.module.css'
import styles from './styles.module.css'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'

function move(ids: string[], id: string, targetId: string) {
  const next = [...ids]
  next.splice(ids.indexOf(id), 1)
  next.splice(ids.indexOf(targetId), 0, id)
  return next
}

function isConflict(e: unknown) {
  return e instanceof APIError && e.data.name === 'ConflictError'
}

function parsePublishError(e: unknown) {
  if (isConflict(e)) {
    return 'Another admin changed the Gallery while you were editing it. The current Gallery has been loaded; please make your changes again.'
  }
  return e
}

/**
 * The order of featured tapestries in the public Gallery. Changes are staged locally and published
 * together, so visitors never see a half-finished order.
 */
export function AdminGallery() {
  const [order, setOrder] = useState<string[]>([])
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const [dragId, setDragId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)

  const [announcement, setAnnouncement] = useState('')
  const [published, setPublished] = useState(false)

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

  // Start over from the published Gallery whenever it is (re)loaded
  const [prevData, setPrevData] = useState(data)
  if (data !== prevData) {
    setPrevData(data)
    setOrder(data?.map((t) => t.id) ?? [])
    setRemoved(new Set())
  }

  const byId = new Map(data?.map((t) => [t.id, t]))
  const live = order.filter((id) => !removed.has(id))
  const publishedOrder = data?.map((t) => t.id).filter((id) => !removed.has(id)) ?? []
  const orderChanged = live.join() !== publishedOrder.join()
  const dirty = orderChanged || removed.size > 0

  const title = (id: string) => byId.get(id)?.title ?? ''

  function edit(nextOrder: string[], nextRemoved: Set<string>, message: string) {
    setOrder(nextOrder)
    setRemoved(nextRemoved)
    setAnnouncement(message)
    setPublished(false)
  }

  function moveBy(id: string, delta: -1 | 1) {
    const index = live.indexOf(id)
    const target = live.at(index + delta)
    if (index + delta < 0 || target === undefined) return
    const next = [...order]
    next[order.indexOf(id)] = target
    next[order.indexOf(target)] = id
    edit(next, removed, `“${title(id)}” moved to position ${index + delta + 1} of ${live.length}.`)
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) {
      return
    }
    const next = move(order, dragId, targetId)
    const nextLive = next.filter((id) => !removed.has(id))
    edit(
      next,
      removed,
      `“${title(dragId)}” moved to position ${nextLive.indexOf(dragId) + 1} of ${nextLive.length}.`,
    )
  }

  const {
    trigger: publish,
    loading: publishing,
    error: publishError,
  } = useAsyncAction(async () => {
    try {
      await resource('adminActivity').create({
        action: 'reorderGallery',
        tapestryIds: live,
        removedTapestryIds: [...removed],
      })
    } catch (e) {
      // Another admin changed the Gallery: load its current state, which discards the local edits
      if (isConflict(e)) reload(noop)
      throw e
    }
    setPublished(true)
    setAnnouncement('Gallery updated. The changes are live.')
    reload(noop)
  })

  const changes = [
    orderChanged && 'Order changed.',
    removed.size > 0 &&
      `${pluralize(removed.size, 'tapestry', 'tapestries')} to remove from the Gallery.`,
  ].filter(Boolean)

  return (
    <>
      <PageHeader
        title="Gallery"
        description={
          <>
            Featured tapestries appear in the public Gallery in this order. Only tapestries shared
            as “Anyone with the link” can be featured; feature them from{' '}
            <Link to={adminPath('tapestries')}>All tapestries</Link>, and they’re added first. Drag
            a card or use the arrows to reorder, then publish your changes.
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              component="a"
              href={dashboardPath('public')}
              target="_blank"
              rel="noreferrer"
              icon="open_in_new"
            >
              View public Gallery
            </Button>
            <Button disabled={!dirty || publishing} onClick={publish}>
              {publishing ? 'Publishing…' : 'Publish changes'}
            </Button>
          </>
        }
      />

      {dirty && (
        <Notice
          tone="warning"
          title="Unpublished changes."
          actions={
            <NoticeButton
              onClick={() => edit(data?.map((t) => t.id) ?? [], new Set(), 'Changes discarded.')}
            >
              Discard changes
            </NoticeButton>
          }
        >
          {changes.join(' ')} Visitors still see the previous Gallery.
        </Notice>
      )}
      {published && !dirty && (
        <Notice tone="success" title="Gallery updated." onDismiss={() => setPublished(false)}>
          The changes are live and recorded in the activity log.
        </Notice>
      )}
      <ErrorText error={error ?? parsePublishError(publishError)} />

      <section aria-labelledby="gallery-heading" className={styles.list}>
        <div className={styles.heading}>
          <h2 id="gallery-heading">
            Featured tapestries <span>({live.length})</span>
          </h2>
          {live.length > 1 && <span>Card 1 is shown first in the Gallery</span>}
        </div>
        <p aria-live="polite" className={common.visuallyHidden}>
          {announcement}
        </p>
        {data?.length === 0 && (
          <p className={styles.empty}>
            No tapestries are featured yet. Feature tapestries shared as “Anyone with the link” from{' '}
            <Link to={adminPath('tapestries')}>All tapestries</Link>.
          </p>
        )}
        <ol className={styles.grid}>
          {order.map((id) => {
            const tapestry = byId.get(id)
            if (!tapestry) {
              return null
            }

            if (removed.has(id)) {
              return (
                <RemovedGalleryCard
                  key={id}
                  tapestry={tapestry}
                  onUndo={() => {
                    const next = new Set(removed)
                    next.delete(id)
                    edit(order, next, `“${tapestry.title}” restored.`)
                  }}
                />
              )
            }

            return (
              <GalleryCard
                key={id}
                tapestry={tapestry}
                position={live.indexOf(id)}
                count={live.length}
                dragging={dragId === id}
                dropTarget={dropId === id && dragId !== id}
                onMove={(delta) => moveBy(id, delta)}
                onRemove={() =>
                  edit(
                    order,
                    new Set(removed).add(id),
                    `“${tapestry.title}” will be removed from the Gallery when you publish.`,
                  )
                }
                onDragStart={(e) => {
                  setDragId(id)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', id)
                }}
                onDragOver={(e) => {
                  if (!dragId) return
                  e.preventDefault()
                  setDropId(id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  dropOn(id)
                  setDragId(null)
                  setDropId(null)
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setDropId(null)
                }}
              />
            )
          })}
        </ol>
      </section>
    </>
  )
}
