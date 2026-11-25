import { useState } from 'react'
import { noop } from 'lodash-es'
import { Link, useNavigate } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { AdminTapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { resource } from '../../../../services/rest-resources'
import { adminPath, tapestryPath } from '../../../../utils/paths'
import { PageHeader } from '../../components/page-header'
import { Panel } from '../../components/panel'
import { Notice } from '../../components/notice'
import { ErrorText } from '../../components/error-text'
import { DataTable } from '../../components/data-table'
import { UserIdentity } from '../../components/user-identity'
import { SharingLevel } from '../../components/sharing-level'
import { TapestryThumbnail } from '../../components/tapestry-thumbnail'
import { formatDateTime, tapestryUrl } from '../../format'
import { presetFilterPath } from '../../use-preset-filter'
import { useFeaturing } from '../use-featuring'
import { FeatureDialog } from '../feature-dialog'
import { DeleteTapestryDialog } from '../delete-tapestry-dialog'
import { ItemsPanel } from './items-panel'
import common from '../../common.module.css'
import styles from './styles.module.css'

function BackLink() {
  return (
    <Link to={adminPath('tapestries')} className={styles.back}>
      <Icon icon="arrow_back" aria-hidden />
      All tapestries
    </Link>
  )
}

export function AdminTapestryDetail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [featuring, setFeaturing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updated, setUpdated] = useState<AdminTapestryDto>()

  const { data, error, reload } = useAsync(
    ({ signal }) => resource('adminTapestries').read({ id }, {}, { signal }),
    [id],
    { clearDataOnReload: false },
  )
  const tapestry = updated?.id === id ? { ...data, ...updated } : data
  const { feature, unfeature, notice } = useFeaturing(setUpdated)

  if (error) {
    return (
      <>
        <BackLink />
        <ErrorText error={error} />
      </>
    )
  }
  if (!tapestry) {
    return <p className={common.muted}>Loading…</p>
  }

  const { owner } = tapestry
  const userAccess = tapestry.userAccess ?? []
  // Only link-shared tapestries can be featured, and only their items can be deleted by admins
  const isLinkShared = tapestry.sharingLevel === 'link'
  const path = tapestryPath(owner.username, tapestry.slug)

  return (
    <>
      <BackLink />
      <PageHeader
        title={tapestry.title}
        description={tapestry.description ?? undefined}
        actions={
          <>
            <Button
              variant="secondary"
              icon="open_in_new"
              component="a"
              href={path}
              target="_blank"
              rel="noreferrer"
            >
              Open tapestry
            </Button>
            {tapestry.featured ? (
              <Button
                variant="secondary"
                onClick={() => void unfeature(tapestry).catch(() => undefined)}
              >
                Remove from Gallery
              </Button>
            ) : (
              isLinkShared && (
                <Button variant="secondary" icon="star" onClick={() => setFeaturing(true)}>
                  Feature in Gallery…
                </Button>
              )
            )}
            <Button variant="primary-negative" icon="delete" onClick={() => setDeleting(true)}>
              Delete permanently…
            </Button>
          </>
        }
      />
      {notice}

      <div className={styles.columns}>
        <Panel title="Details">
          <div className={styles.summary}>
            <TapestryThumbnail tapestry={tapestry} size="large" />
            <SharingLevel tapestry={tapestry} />
          </div>
          <dl className={styles.details}>
            <dt>Address</dt>
            <dd>
              <a href={path} target="_blank" rel="noreferrer">
                {tapestryUrl(owner.username, tapestry.slug)}
              </a>
            </dd>
            <dt>Items</dt>
            <dd>{tapestry.itemCount.toLocaleString()}</dd>
            <dt>Created</dt>
            <dd>{formatDateTime(tapestry.createdAt)}</dd>
            <dt>Last updated</dt>
            <dd>{formatDateTime(tapestry.updatedAt)}</dd>
            {tapestry.featured && (
              <>
                <dt>In the Gallery</dt>
                <dd>
                  Position {(tapestry.galleryPosition ?? 0) + 1}, featured{' '}
                  {formatDateTime(tapestry.featuredAt)} ·{' '}
                  <Link to={adminPath('gallery')}>Reorder</Link>
                </dd>
              </>
            )}
            <dt>Forked from</dt>
            <dd>
              {tapestry.parent ? (
                <Link to={adminPath('tapestries', tapestry.parent.id)}>
                  {tapestry.parent.title} by @{tapestry.parent.ownerUsername}
                </Link>
              ) : tapestry.parentId ? (
                'A tapestry that has been deleted'
              ) : (
                'Not a fork'
              )}
            </dd>
          </dl>
          <p className={styles.hint}>Only the owner can change sharing.</p>
        </Panel>

        <Panel title="Owner">
          <UserIdentity
            user={owner}
            linkTo={presetFilterPath('users', { 'id:eq': owner.id }, `Showing @${owner.username}`)}
          />
          <Link
            to={presetFilterPath(
              'tapestries',
              { 'ownerId:eq': owner.id },
              `Showing tapestries owned by @${owner.username}`,
            )}
          >
            All {owner.tapestryCount} tapestries by @{owner.username}
          </Link>
        </Panel>
      </div>

      <Panel flush title={`People with access (${userAccess.length})`}>
        <DataTable
          caption="People with access"
          minWidth={480}
          columns={[
            {
              key: 'user',
              label: 'User',
              render: (access) => <UserIdentity user={access.user} />,
            },
            {
              key: 'access',
              label: 'Access',
              render: (access) => (access.canEdit ? 'Can view and edit' : 'Can view'),
            },
          ]}
          rows={userAccess}
          rowKey={(access) => access.id}
          empty="Nobody else has been given access"
        />
      </Panel>

      {isLinkShared ? (
        <ItemsPanel
          tapestry={tapestry}
          onDeleted={() => {
            setUpdated(undefined)
            reload(noop)
          }}
        />
      ) : (
        <Notice tone="info">
          Admins can delete items only in tapestries shared as “Anyone with the link”. Open the
          tapestry to see its items.
        </Notice>
      )}

      {featuring && (
        <FeatureDialog
          tapestry={tapestry}
          onCancel={() => setFeaturing(false)}
          onConfirm={async () => {
            try {
              await feature(tapestry)
            } finally {
              setFeaturing(false)
            }
          }}
        />
      )}
      {deleting && (
        <DeleteTapestryDialog
          tapestry={tapestry}
          onCancel={() => setDeleting(false)}
          onDeleted={() => void navigate(adminPath('tapestries'), { replace: true })}
        />
      )}
    </>
  )
}
