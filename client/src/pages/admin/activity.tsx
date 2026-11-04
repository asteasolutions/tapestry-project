import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import {
  ADMIN_ACTIONS,
  AdminAction,
  AdminActivityDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { listAll, resource } from '../../services/rest-resources'
import { adminPath } from '../../utils/paths'
import {
  Column,
  DataTable,
  DateInput,
  ErrorText,
  FilterField,
  NativeSelect,
  Pagination,
  SectionHeader,
} from './components'
import { csvDate, downloadCsv } from './csv'
import { dayStart, formatDateTime, SHARING_LEVEL_LABELS } from './format'
import { cleanFilter, useAdminList } from './use-admin-list'
import styles from './styles.module.css'

const ACTION_LABELS: Record<AdminAction, string> = {
  openTapestry: 'Opened private tapestry',
  changeSharing: 'Changed sharing',
  changeFeatured: 'Changed featured',
  approveFeatureRequest: 'Approved feature request',
  declineFeatureRequest: 'Declined feature request',
  reorderGallery: 'Reordered Gallery',
  deleteTapestry: 'Deleted tapestry',
  deleteItems: 'Deleted items',
  changeRole: 'Changed role',
}

function sharingLabel(level: unknown) {
  return typeof level === 'string' && level in SHARING_LEVEL_LABELS
    ? SHARING_LEVEL_LABELS[level as keyof typeof SHARING_LEVEL_LABELS]
    : String(level)
}

function describeDetails({ action, details }: AdminActivityDto): string {
  if (!details) return ''
  switch (action) {
    case 'changeSharing':
      return `${sharingLabel(details.from)} → ${sharingLabel(details.to)}`
    case 'changeFeatured':
      return details.featured ? 'Featured' : 'Removed from the Gallery'
    case 'changeRole':
      return `${String(details.from)} → ${String(details.to)}`
    case 'deleteTapestry':
      return `${String(details.itemCount)} items`
    case 'deleteItems': {
      const items = Array.isArray(details.items)
        ? (details.items as { title?: string | null; type?: string }[])
        : []
      return items.map((item) => item.title || `untitled ${item.type}`).join(', ')
    }
    case 'reorderGallery':
      return Array.isArray(details.tapestryIds) ? `${details.tapestryIds.length} tapestries` : ''
    default:
      return ''
  }
}

function Target({ entry }: { entry: AdminActivityDto }) {
  const label = entry.targetLabel ?? '—'
  // Deleted tapestries leave no record, so only link to tapestries that may still exist
  if (entry.targetType === 'tapestry' && entry.targetId && entry.action !== 'deleteTapestry') {
    return <Link to={adminPath('tapestries', entry.targetId)}>{label}</Link>
  }
  if (entry.targetType === 'user' && entry.targetId) {
    return (
      <Link
        to={adminPath(
          'users',
          undefined,
          new URLSearchParams({
            filter: JSON.stringify({ 'id:eq': entry.targetId }),
            label: `Showing ${label}`,
          }),
        )}
      >
        {label}
      </Link>
    )
  }
  if (entry.targetType === 'gallery') return <>Gallery</>
  return <>{label}</>
}

export function AdminActivityLog() {
  const [action, setAction] = useState<AdminAction | ''>('')
  const [admin, setAdmin] = useState('')
  const [target, setTarget] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<unknown>()

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

  async function exportCsv() {
    setExporting(true)
    setExportError(undefined)
    try {
      const all = await listAll(resource('adminActivity'), {
        filter: list.query.filter,
        orderBy: list.query.orderBy,
      })
      downloadCsv(
        `admin-activity-${new Date().toISOString().slice(0, 10)}`,
        ['Time', 'Admin', 'Action', 'Target type', 'Target', 'Target ID', 'Details'],
        all.map((entry: AdminActivityDto) => [
          csvDate(entry.createdAt),
          entry.adminUsername,
          ACTION_LABELS[entry.action],
          entry.targetType,
          entry.targetLabel,
          entry.targetId,
          entry.details ? JSON.stringify(entry.details) : '',
        ]),
      )
    } catch (e) {
      setExportError(e)
    } finally {
      setExporting(false)
    }
  }

  const columns: Column<AdminActivityDto>[] = [
    {
      key: 'time',
      label: 'Time',
      sortField: 'createdAt',
      className: styles.nowrap,
      render: (entry) => formatDateTime(entry.createdAt),
    },
    { key: 'admin', label: 'Admin', sortField: 'adminUsername', render: (e) => e.adminUsername },
    { key: 'action', label: 'Action', sortField: 'action', render: (e) => ACTION_LABELS[e.action] },
    { key: 'target', label: 'Target', render: (entry) => <Target entry={entry} /> },
    { key: 'details', label: 'Details', render: describeDetails },
  ]

  return (
    <>
      <SectionHeader
        title="Activity log"
        description="A read-only record of admin actions. Entries cannot be edited or deleted."
        actions={
          <Button variant="secondary" icon="download" disabled={exporting} onClick={exportCsv}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />
      <ErrorText error={exportError} />
      <div className={styles.filters}>
        <FilterField label="Action">
          <NativeSelect<AdminAction | ''>
            value={action}
            onChange={setAction}
            options={[
              { value: '', label: 'Any' },
              ...ADMIN_ACTIONS.map((value) => ({ value, label: ACTION_LABELS[value] })),
            ]}
          />
        </FilterField>
        <FilterField label="Admin">
          <input
            className={styles.select}
            value={admin}
            placeholder="Username"
            onChange={(e) => setAdmin(e.target.value)}
          />
        </FilterField>
        <FilterField label="Target">
          <input
            className={styles.select}
            value={target}
            placeholder="Tapestry title, username…"
            onChange={(e) => setTarget(e.target.value)}
          />
        </FilterField>
        <FilterField label="From">
          <DateInput value={from} onChange={setFrom} ariaLabel="From" />
        </FilterField>
        <FilterField label="To">
          <DateInput value={to} onChange={setTo} ariaLabel="To" />
        </FilterField>
      </div>
      <ErrorText error={list.error} />
      <DataTable
        caption="Admin activity"
        columns={columns}
        rows={list.data?.data}
        rowKey={(entry) => entry.id}
        sort={list.sort}
        onSort={list.setSort}
        loading={list.loading}
        emptyText="No admin activity matches these filters"
      />
      <Pagination page={list.page} total={list.data?.total} onPageChange={list.setPage} />
    </>
  )
}
