import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import {
  ADMIN_ACTIONS,
  AdminAction,
  AdminActivityDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { listAll, resource } from '../../../services/rest-resources'
import { adminPath } from '../../../utils/paths'
import { PageHeader } from '../components/page-header'
import { Panel } from '../components/panel'
import { ErrorText } from '../components/error-text'
import { Field, FilterBar, Select, TextInput } from '../components/field'
import { Column, DataTable, EmptyState } from '../components/data-table'
import { Pagination } from '../components/pagination'
import { csvDate, downloadCsv } from '../csv'
import { dayStart, formatDateTime, pluralize } from '../format'
import { cleanFilter, useAdminList } from '../use-admin-list'
import { presetFilterPath } from '../use-preset-filter'
import styles from './styles.module.css'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { fileName } from '../reports/report-csv'

const ACTION_LABELS: Record<AdminAction, string> = {
  openTapestry: 'Opened tapestry',
  changeFeatured: 'Changed featuring',
  reorderGallery: 'Published Gallery',
  deleteTapestry: 'Deleted tapestry',
  deleteItems: 'Deleted items',
  changeRole: 'Changed role',
}

function describeDetails({ action, details }: AdminActivityDto): string {
  if (!details) return ''
  switch (action) {
    case 'changeFeatured':
      return details.featured ? 'Featured in the Gallery' : 'Removed from the Gallery'
    case 'changeRole':
      return `${String(details.from)} → ${String(details.to)}`
    case 'deleteTapestry':
      return typeof details.itemCount === 'number' ? pluralize(details.itemCount, 'item') : ''
    case 'deleteItems': {
      const items = Array.isArray(details.items)
        ? (details.items as { title?: string | null; type?: string }[])
        : []
      return items.map((item) => item.title || `untitled ${item.type}`).join(', ')
    }
    case 'reorderGallery': {
      const kept = Array.isArray(details.tapestryIds) ? details.tapestryIds.length : 0
      const removed = Array.isArray(details.removedTapestryIds)
        ? details.removedTapestryIds.length
        : 0
      return [pluralize(kept, 'tapestry', 'tapestries'), removed > 0 && `${removed} removed`]
        .filter(Boolean)
        .join(', ')
    }
    default:
      return ''
  }
}

function downloadActivityCsv(entries: AdminActivityDto[]) {
  downloadCsv(
    fileName('admin-activity'),
    ['Time', 'Admin', 'Action', 'Target type', 'Target', 'Target ID', 'Details'],
    entries.map((entry) => [
      csvDate(entry.createdAt),
      entry.adminUsername,
      ACTION_LABELS[entry.action],
      entry.targetType,
      entry.targetLabel,
      entry.targetId,
      entry.details ? JSON.stringify(entry.details) : '',
    ]),
  )
}

function Target({ entry }: { entry: AdminActivityDto }) {
  const label = entry.targetLabel ?? '—'
  // Deleted tapestries leave no record, so only link to tapestries that may still exist
  if (entry.targetType === 'tapestry' && entry.targetId && entry.action !== 'deleteTapestry') {
    return <Link to={adminPath('tapestries', entry.targetId)}>{label}</Link>
  }
  if (entry.targetType === 'user' && entry.targetId) {
    return (
      <Link to={presetFilterPath('users', { 'id:eq': entry.targetId }, `Showing ${label}`)}>
        {label}
      </Link>
    )
  }
  if (entry.targetType === 'gallery') return <Link to={adminPath('gallery')}>Gallery</Link>
  return <>{label}</>
}

export function AdminActivityLog() {
  const [action, setAction] = useState<AdminAction | ''>('')
  const [admin, setAdmin] = useState('')
  const [target, setTarget] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const list = useAdminList(
    (query, signal) => resource('adminActivity').list(query, { signal }),
    cleanFilter({
      'action:eq': action,
      'adminUsername:icontains': admin.trim(),
      'targetLabel:icontains': target.trim(),
      'createdAt:gte': dayStart(from),
      'createdAt:lt': dayStart(to, 1),
    }),
    { field: 'createdAt', direction: 'desc' },
  )
  const { query, data } = list
  const total = data?.total

  const {
    loading: exporting,
    error: exportError,
    trigger: exportCsv,
  } = useAsyncAction(async ({ signal }) =>
    downloadActivityCsv(await listAll(resource('adminActivity'), query, signal)),
  )

  const columns: Column<AdminActivityDto>[] = [
    {
      key: 'time',
      label: 'Time',
      sortField: 'createdAt',
      nowrap: true,
      render: (entry) => formatDateTime(entry.createdAt),
    },
    {
      key: 'admin',
      label: 'Admin',
      sortField: 'adminUsername',
      firstDirection: 'asc',
      render: (e) => `@${e.adminUsername}`,
    },
    {
      key: 'action',
      label: 'Action',
      sortField: 'action',
      firstDirection: 'asc',
      render: (e) => ACTION_LABELS[e.action],
    },
    { key: 'target', label: 'Target', render: (entry) => <Target entry={entry} /> },
    {
      key: 'details',
      label: 'Details',
      render: (entry) => <span className={styles.details}>{describeDetails(entry)}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Activity log"
        description="A read-only record of every admin action, including opening a tapestry. Entries can’t be edited or deleted."
        actions={
          <Button variant="secondary" icon="download" disabled={exporting} onClick={exportCsv}>
            {exporting ? 'Exporting…' : 'Export view as CSV'}
          </Button>
        }
      />
      <ErrorText error={exportError} />
      <Panel flush aria-labelledby="activity-heading">
        <div className={styles.filters}>
          <FilterBar>
            <Field label="Action">
              <Select<AdminAction | ''>
                value={action}
                onChange={setAction}
                options={[
                  { value: '', label: 'Any action' },
                  ...ADMIN_ACTIONS.map((value) => ({ value, label: ACTION_LABELS[value] })),
                ]}
              />
            </Field>
            <Field label="Admin">
              <TextInput
                value={admin}
                placeholder="Username"
                onChange={(e) => setAdmin(e.target.value)}
              />
            </Field>
            <Field label="Target">
              <TextInput
                value={target}
                placeholder="Tapestry title, username…"
                onChange={(e) => setTarget(e.target.value)}
              />
            </Field>
            <Field label="From">
              <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </FilterBar>
        </div>
        <h2 id="activity-heading" className={styles.summary}>
          {total === undefined ? 'Loading activity…' : pluralize(total, 'entry', 'entries')}
        </h2>
        <ErrorText error={list.error} />
        <DataTable
          caption="Admin activity"
          columns={columns}
          rows={data?.data}
          rowKey={(entry) => entry.id}
          sort={list.sort}
          onSort={list.setSort}
          loading={list.loading}
          empty={<EmptyState title="No admin activity matches these filters" />}
        />
        <Pagination
          page={list.page}
          pageSize={list.pageSize}
          total={total}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
        />
      </Panel>
    </>
  )
}
