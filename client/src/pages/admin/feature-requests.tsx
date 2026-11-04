import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { AdminFeatureRequestDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { FeatureRequestStatus } from 'tapestry-shared/src/data-transfer/resources/dtos/feature-request'
import { resource } from '../../services/rest-resources'
import { adminPath, tapestryPath } from '../../utils/paths'
import {
  Badge,
  ContactRoute,
  ErrorText,
  FilterField,
  NativeSelect,
  Pagination,
  SectionHeader,
} from './components'
import { formatDate, formatDateTime, SHARING_LEVEL_LABELS } from './format'
import { cleanFilter, useAdminList } from './use-admin-list'
import { useAdminContext } from '.'
import styles from './styles.module.css'

const STATUS_LABELS: Record<FeatureRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
  closed: 'Closed automatically',
}

function RequestCard({
  request,
  onDecided,
}: {
  request: AdminFeatureRequestDto
  onDecided: () => unknown
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const { tapestry, requester } = request

  async function decide(status: 'approved' | 'declined') {
    setBusy(true)
    setError(undefined)
    try {
      await resource('adminFeatureRequests').update({ id: request.id }, { status })
      onDecided()
    } catch (e) {
      setError(e)
      setBusy(false)
    }
  }

  const ownerFilter = requester && {
    filter: JSON.stringify({ 'ownerId:eq': requester.id }),
    label: `Showing tapestries owned by ${requester.username}`,
  }

  return (
    <article className={`${styles.panel} ${styles.requestCard}`} aria-label={request.tapestryTitle}>
      {tapestry?.thumbnail ? (
        <img src={tapestry.thumbnail} alt="" className={styles.thumbnail} />
      ) : (
        <span className={styles.thumbnail} />
      )}
      <div className={styles.requestBody}>
        <Text component="div" style={{ fontWeight: 600 }}>
          {tapestry ? (
            <Link to={adminPath('tapestries', tapestry.id)}>{tapestry.title}</Link>
          ) : (
            `${request.tapestryTitle} (deleted)`
          )}{' '}
          <Badge tone={request.status === 'pending' ? 'brand' : 'neutral'}>
            {STATUS_LABELS[request.status]}
          </Badge>
        </Text>
        {tapestry && (
          <Text variant="bodySm" component="div" className={styles.muted}>
            {SHARING_LEVEL_LABELS[tapestry.sharingLevel]} · {tapestry.itemCount} items ·{' '}
            <a
              href={tapestryPath(tapestry.owner.username, tapestry.slug)}
              target="_blank"
              rel="noreferrer"
            >
              Preview
            </a>
          </Text>
        )}
        <Text variant="bodySm" component="div">
          Submitted {formatDateTime(request.createdAt)}
          {requester ? (
            <>
              {' '}
              by <strong>{requester.username}</strong> · <ContactRoute user={requester} />
            </>
          ) : (
            ' by a user who no longer exists'
          )}
        </Text>
        {ownerFilter && (
          <Text variant="bodySm" component="div">
            <Link to={adminPath('tapestries', undefined, new URLSearchParams(ownerFilter))}>
              Other tapestries by {requester.username} ({requester.tapestryCount})
            </Link>
          </Text>
        )}
        {request.decidedAt && (
          <Text variant="bodyXs" component="div" className={styles.muted}>
            {STATUS_LABELS[request.status]} {formatDate(request.decidedAt)}
            {request.decidedByUsername && ` by ${request.decidedByUsername}`}
          </Text>
        )}
        <ErrorText error={error} />
      </div>
      {request.status === 'pending' && (
        <div className={styles.actions}>
          <Button
            variant="secondary"
            icon="close"
            disabled={busy}
            onClick={() => void decide('declined')}
          >
            Decline
          </Button>
          <Button icon="check" disabled={busy || !tapestry} onClick={() => void decide('approved')}>
            Approve
          </Button>
        </div>
      )}
    </article>
  )
}

export function AdminFeatureRequests() {
  const { refreshPendingCount } = useAdminContext()
  const [status, setStatus] = useState<FeatureRequestStatus | ''>('pending')

  const list = useAdminList(
    (query, signal) => resource('adminFeatureRequests').list(query, { signal }),
    cleanFilter({ 'status:eq': status }),
    // Requests are processed oldest first
    { field: 'createdAt', direction: 'asc' },
  )

  return (
    <>
      <SectionHeader
        title="Feature requests"
        description="Owners ask for their link-shared tapestries to be featured in the Gallery. Approving a request features the tapestry at the beginning of the Gallery."
      />
      <div className={styles.filters}>
        <FilterField label="Status">
          <NativeSelect<FeatureRequestStatus | ''>
            value={status}
            onChange={setStatus}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'declined', label: 'Declined' },
              { value: 'closed', label: 'Closed automatically' },
              { value: '', label: 'All' },
            ]}
          />
        </FilterField>
        <FilterField label="Order">
          <NativeSelect<'asc' | 'desc'>
            value={list.sort.direction}
            onChange={(direction) => list.setSort({ field: 'createdAt', direction })}
            options={[
              { value: 'asc', label: 'Oldest first' },
              { value: 'desc', label: 'Newest first' },
            ]}
          />
        </FilterField>
      </div>
      <ErrorText error={list.error} />
      {list.data?.data.length === 0 && (
        <Text className={styles.muted}>
          {status === 'pending' ? 'There are no pending requests.' : 'No requests to show.'}
        </Text>
      )}
      {list.data?.data.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          onDecided={() => {
            list.reload()
            refreshPendingCount()
          }}
        />
      ))}
      <Pagination page={list.page} total={list.data?.total} onPageChange={list.setPage} />
    </>
  )
}
