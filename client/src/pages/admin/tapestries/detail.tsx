import { useState } from 'react'
import { noop } from 'lodash-es'
import { Link, useNavigate } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { AdminTapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { listAll, resource } from '../../../services/rest-resources'
import { adminPath, tapestryPath } from '../../../utils/paths'
import {
  Badge,
  Column,
  ConfirmDeletionModal,
  DataTable,
  ErrorText,
  SectionHeader,
  UserIdentity,
} from '../components'
import { formatDateTime, SHARING_LEVEL_LABELS, tapestryUrl } from '../format'
import { DeleteTapestryDialog, SharingControls } from './sharing-controls'
import { useAdminContext } from '..'
import styles from '../styles.module.css'

const ITEM_TYPE_LABELS: Record<ItemDto['type'], string> = {
  text: 'Text',
  actionButton: 'Action button',
  audio: 'Audio',
  video: 'Video',
  book: 'Book',
  image: 'Image',
  iiif: 'IIIF',
  pdf: 'PDF',
  webpage: 'Web page',
}

function itemLabel(item: ItemDto) {
  if (item.title) return item.title
  if ('text' in item && item.text) {
    const text = new DOMParser().parseFromString(item.text, 'text/html').body.textContent.trim()
    if (text) return text.length > 80 ? `${text.slice(0, 80)}…` : text
  }
  return `Untitled ${ITEM_TYPE_LABELS[item.type].toLowerCase()}`
}

/** Builds a link to an admin list with a fixed filter. */
function listLink(section: 'tapestries' | 'users', filter: Record<string, string>, label: string) {
  return adminPath(
    section,
    undefined,
    new URLSearchParams({ filter: JSON.stringify(filter), label }),
  )
}

function ItemsPanel({
  tapestry,
  onDeleted,
}: {
  tapestry: AdminTapestryDto
  onDeleted: () => unknown
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)

  const { data, loading, error, reload } = useAsync(
    async ({ signal }) => {
      const [items, steps] = await Promise.all([
        listAll(
          resource('items'),
          { filter: { 'tapestryId:eq': tapestry.id }, orderBy: 'createdAt' },
          signal,
        ),
        listAll(
          resource('presentationSteps'),
          { filter: { 'tapestryId:eq': tapestry.id } },
          signal,
        ),
      ])
      return {
        items,
        inPresentation: new Set(
          steps.flatMap((s) => ('itemId' in s && s.itemId ? [s.itemId] : [])),
        ),
      }
    },
    [tapestry.id],
    { clearDataOnReload: false },
  )

  const selectedItems = data?.items.filter((item) => selected.has(item.id)) ?? []
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const columns: Column<ItemDto>[] = [
    {
      key: 'select',
      label: 'Select',
      render: (item) => (
        <Checkbox
          checked={selected.has(item.id)}
          onChange={() => toggle(item.id)}
          label={{
            content: <span className={styles.visuallyHidden}>Select {itemLabel(item)}</span>,
          }}
        />
      ),
    },
    { key: 'title', label: 'Item', render: itemLabel },
    { key: 'type', label: 'Type', render: (item) => ITEM_TYPE_LABELS[item.type] },
    {
      key: 'presentation',
      label: 'Presentation',
      render: (item) => (data?.inPresentation.has(item.id) ? <Badge>In presentation</Badge> : null),
    },
    {
      key: 'createdAt',
      label: 'Added',
      className: styles.nowrap,
      render: (item) => formatDateTime(item.createdAt),
    },
  ]

  return (
    <section className={styles.panel} aria-labelledby="items-heading">
      <div className={styles.sectionHeader}>
        <Text variant="body" component="h2" id="items-heading" style={{ fontWeight: 600 }}>
          Items ({data?.items.length ?? tapestry.itemCount})
        </Text>
        <Button
          variant="primary-negative"
          size="small"
          icon="delete"
          disabled={selectedItems.length === 0}
          onClick={() => setConfirming(true)}
        >
          Delete selected{selectedItems.length > 0 && ` (${selectedItems.length})`}
        </Button>
      </div>
      <ErrorText error={error} />
      <DataTable
        caption="Items"
        columns={columns}
        rows={data?.items}
        rowKey={(item) => item.id}
        loading={loading}
        emptyText="This tapestry has no items"
      />
      {confirming && (
        <ConfirmDeletionModal
          title={
            selectedItems.length === 1 ? 'Delete item permanently' : 'Delete items permanently'
          }
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            await resource('adminActivity').create({
              action: 'deleteItems',
              tapestryId: tapestry.id,
              itemIds: selectedItems.map((item) => item.id),
            })
            setConfirming(false)
            setSelected(new Set())
            reload(noop)
            onDeleted()
          }}
        >
          <Text component="p">
            The following {selectedItems.length === 1 ? 'item' : `${selectedItems.length} items`}{' '}
            will be deleted from “{tapestry.title}”, together with their connections and comments:
          </Text>
          <ul>
            {selectedItems.map((item) => (
              <li key={item.id}>
                <Text variant="bodySm">
                  {itemLabel(item)} ({ITEM_TYPE_LABELS[item.type]})
                  {data?.inPresentation.has(item.id) && ' — also removed from the presentation'}
                </Text>
              </li>
            ))}
          </ul>
        </ConfirmDeletionModal>
      )}
    </section>
  )
}

export function AdminTapestryDetail({ id }: { id: string }) {
  const navigate = useNavigate()
  const { refreshPendingCount } = useAdminContext()
  const [deleting, setDeleting] = useState(false)
  const [updated, setUpdated] = useState<AdminTapestryDto>()

  const { data, error, reload } = useAsync(
    ({ signal }) => resource('adminTapestries').read({ id }, {}, { signal }),
    [id],
    { clearDataOnReload: false },
  )
  const tapestry = updated?.id === id ? updated : data

  if (error) {
    return (
      <>
        <Link to={adminPath('tapestries')}>← All tapestries</Link>
        <ErrorText error={error} />
      </>
    )
  }
  if (!tapestry) return <Text className={styles.muted}>Loading…</Text>

  const { owner } = tapestry
  const userAccess = tapestry.userAccess ?? []

  return (
    <>
      <Link to={adminPath('tapestries')}>← All tapestries</Link>
      <SectionHeader
        title={tapestry.title}
        description={tapestry.description ?? undefined}
        actions={
          <>
            <Button
              variant="secondary"
              icon="open_in_new"
              component="a"
              href={tapestryPath(owner.username, tapestry.slug)}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </Button>
            <Button
              variant="secondary"
              icon="edit"
              component="a"
              href={tapestryPath(owner.username, tapestry.slug, 'edit')}
              target="_blank"
              rel="noreferrer"
            >
              Open in editor
            </Button>
            <Button variant="primary-negative" icon="delete" onClick={() => setDeleting(true)}>
              Delete tapestry
            </Button>
          </>
        }
      />

      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby="details-heading">
          <Text variant="body" component="h2" id="details-heading" style={{ fontWeight: 600 }}>
            Details
          </Text>
          <dl className={styles.detailsGrid}>
            <dt>Slug</dt>
            <dd>
              <code>{tapestry.slug}</code>
            </dd>
            <dt>URL</dt>
            <dd>
              <a
                href={tapestryPath(owner.username, tapestry.slug)}
                target="_blank"
                rel="noreferrer"
              >
                {tapestryUrl(owner.username, tapestry.slug)}
              </a>
            </dd>
            <dt>Items</dt>
            <dd>{tapestry.itemCount}</dd>
            <dt>Created</dt>
            <dd>{formatDateTime(tapestry.createdAt)}</dd>
            <dt>Last updated</dt>
            <dd>{formatDateTime(tapestry.updatedAt)}</dd>
            <dt>Forked from</dt>
            <dd>
              {tapestry.parent ? (
                <Link to={adminPath('tapestries', tapestry.parent.id)}>
                  {tapestry.parent.title} by {tapestry.parent.ownerUsername}
                </Link>
              ) : tapestry.parentId ? (
                'A tapestry that has been deleted'
              ) : (
                'Not a fork'
              )}
            </dd>
          </dl>
        </section>

        <section className={styles.panel} aria-labelledby="owner-heading">
          <Text variant="body" component="h2" id="owner-heading" style={{ fontWeight: 600 }}>
            Owner
          </Text>
          <UserIdentity
            user={owner}
            linkTo={listLink('users', { 'id:eq': owner.id }, `Showing ${owner.username}`)}
          />
          <Link
            to={listLink(
              'tapestries',
              { 'ownerId:eq': owner.id },
              `Showing tapestries owned by ${owner.username}`,
            )}
          >
            All {owner.tapestryCount} tapestries by {owner.username}
          </Link>
        </section>

        <section className={styles.panel} aria-labelledby="sharing-heading">
          <Text variant="body" component="h2" id="sharing-heading" style={{ fontWeight: 600 }}>
            Sharing
          </Text>
          <Text variant="bodySm" className={styles.muted}>
            Currently: {SHARING_LEVEL_LABELS[tapestry.sharingLevel]}
            {tapestry.featured &&
              ` · featured since ${formatDateTime(tapestry.featuredAt)}, position ${(tapestry.galleryPosition ?? 0) + 1}`}
          </Text>
          <SharingControls
            tapestry={tapestry}
            onUpdated={(t) => {
              setUpdated(t)
              refreshPendingCount()
            }}
          />
          {tapestry.pendingFeatureRequestId && (
            <Link to={adminPath('feature-requests')}>
              This tapestry has a pending feature request
            </Link>
          )}
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="access-heading">
        <Text variant="body" component="h2" id="access-heading" style={{ fontWeight: 600 }}>
          People with access ({userAccess.length})
        </Text>
        <DataTable
          caption="People with access"
          columns={[
            {
              key: 'user',
              label: 'User',
              render: (access) => <UserIdentity user={access.user} />,
            },
            {
              key: 'access',
              label: 'Access',
              render: (access) => <Badge>{access.canEdit ? 'Can edit' : 'Can view'}</Badge>,
            },
          ]}
          rows={userAccess}
          rowKey={(access) => access.id}
          emptyText="Nobody else has been given access"
        />
      </section>

      <ItemsPanel
        tapestry={tapestry}
        onDeleted={() => {
          setUpdated(undefined)
          reload(noop)
        }}
      />

      {deleting && (
        <DeleteTapestryDialog
          tapestry={tapestry}
          onCancel={() => setDeleting(false)}
          onDeleted={() => {
            refreshPendingCount()
            void navigate(adminPath('tapestries'), { replace: true })
          }}
        />
      )}
    </>
  )
}
