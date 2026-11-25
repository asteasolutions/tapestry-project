import { useState } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import {
  AdminTapestryDto,
  SharingLevel,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { listAll, resource } from '../../../../services/rest-resources'
import { adminPath, tapestryPath } from '../../../../utils/paths'
import { PageHeader } from '../../components/page-header'
import { Panel } from '../../components/panel'
import { Notice, NoticeButton } from '../../components/notice'
import { ErrorText } from '../../components/error-text'
import {
  Field,
  FieldGroup,
  FilterBar,
  SearchInput,
  Select,
  TextInput,
} from '../../components/field'
import { Column, DataTable, EmptyState } from '../../components/data-table'
import { Pagination } from '../../components/pagination'
import { ActionsMenu } from '../../components/actions-menu'
import { SharingLevel as SharingLevelLabel } from '../../components/sharing-level'
import { TapestryThumbnail } from '../../components/tapestry-thumbnail'
import { csvDate, downloadCsv } from '../../csv'
import {
  contactLine,
  dayStart,
  formatDate,
  pluralize,
  SHARING_LEVEL_LABELS,
  tapestryUrl,
} from '../../format'
import { cleanFilter, Sort, useAdminList } from '../../use-admin-list'
import { presetFilterPath, usePresetFilter } from '../../use-preset-filter'
import { useFeaturing } from '../use-featuring'
import { FeatureDialog } from '../feature-dialog'
import { DeleteTapestryDialog } from '../delete-tapestry-dialog'
import common from '../../common.module.css'
import styles from './styles.module.css'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { fileName } from '../../reports/report-csv'

type DateField = 'updatedAt' | 'createdAt'
type DateRange = '' | '7' | '30' | '90' | 'custom'

const SORT_LABELS: Record<string, string> = {
  title: 'title',
  'items._count': 'items',
  createdAt: 'created',
  updatedAt: 'last updated',
}

function describeSort({ field, direction }: Sort) {
  const label = SORT_LABELS[field] ?? field
  if (field === 'title') return `${label}, ${direction === 'asc' ? 'A to Z' : 'Z to A'}`
  if (field === 'items._count') return `${label}, ${direction === 'asc' ? 'fewest' : 'most'} first`
  return `${label}, ${direction === 'asc' ? 'oldest' : 'newest'} first`
}

function dateRangeFilter(field: DateField, range: DateRange, from: string, to: string) {
  if (range === 'custom') {
    return { [`${field}:gte`]: dayStart(from), [`${field}:lt`]: dayStart(to, 1) }
  }
  if (range) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - Number(range) + 1)
    return { [`${field}:gte`]: start.toISOString() }
  }
  return {}
}

function downloadTapestriesCSV(tapestries: AdminTapestryDto[]) {
  downloadCsv(
    fileName('tapestries'),
    [
      'Title',
      'Slug',
      'Owner username',
      'Owner email',
      'Sharing level',
      'Invited people',
      'Featured',
      'Items',
      'Created',
      'Last updated',
      'URL',
    ],
    tapestries.map((t) => [
      t.title,
      t.slug,
      t.owner.username,
      t.owner.email,
      SHARING_LEVEL_LABELS[t.sharingLevel],
      t.invitedCount,
      t.featured ? 'Yes' : 'No',
      t.itemCount,
      csvDate(t.createdAt),
      csvDate(t.updatedAt),
      tapestryUrl(t.owner.username, t.slug),
    ]),
  )
}

function TapestryTitle({ tapestry }: { tapestry: AdminTapestryDto }) {
  const path = tapestryPath(tapestry.owner.username, tapestry.slug)
  return (
    <div className={styles.tapestry}>
      <TapestryThumbnail tapestry={tapestry} />
      <div className={styles.titleText}>
        <a href={path} target="_blank" rel="noreferrer" className={styles.title}>
          {tapestry.title}
        </a>
        <span className={clsx(common.mono, styles.path)}>{path}</span>
      </div>
    </div>
  )
}

export function AdminTapestryList() {
  const { preset, label: presetLabel, clear: clearPreset } = usePresetFilter()

  const [search, setSearch] = useState('')
  const [sharingLevel, setSharingLevel] = useState<SharingLevel | ''>('')
  const [featured, setFeatured] = useState<'' | 'true' | 'false'>('')
  const [owner, setOwner] = useState('')
  const [dateField, setDateField] = useState<DateField>('updatedAt')
  const [dateRange, setDateRange] = useState<DateRange>('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [featuring, setFeaturing] = useState<AdminTapestryDto | null>(null)
  const [deleting, setDeleting] = useState<AdminTapestryDto | null>(null)
  const [deletedTitle, setDeletedTitle] = useState<string | null>(null)

  const [updates, setUpdates] = useState<Record<string, AdminTapestryDto>>({})

  const filtersActive =
    !!search.trim() || !!sharingLevel || !!featured || !!owner.trim() || !!dateRange

  const list = useAdminList(
    (query, signal) => resource('adminTapestries').list(query, { signal }),
    cleanFilter({
      ...preset,
      'search:icontains': search.trim(),
      'sharingLevel:eq': sharingLevel,
      'featured:eq': featured,
      'owner:icontains': owner.trim(),
      ...dateRangeFilter(dateField, dateRange, customFrom, customTo),
    }),
    { field: 'updatedAt', direction: 'desc' },
  )
  const { data, query, page, pageSize, sort } = list
  const rows = data?.data.map((t) => updates[t.id] ?? t)
  const total = data?.total

  const { feature, unfeature, notice } = useFeaturing((tapestry) =>
    setUpdates((current) => ({ ...current, [tapestry.id]: tapestry })),
  )

  function clearFilters() {
    setSearch('')
    setSharingLevel('')
    setFeatured('')
    setOwner('')
    setDateRange('')
    setCustomFrom('')
    setCustomTo('')
  }

  const {
    trigger: exportCsv,
    loading: exporting,
    error: exportError,
  } = useAsyncAction(async ({ signal }) =>
    downloadTapestriesCSV(await listAll(resource('adminTapestries'), query, signal)),
  )

  const columns: Column<AdminTapestryDto>[] = [
    {
      key: 'title',
      label: 'Tapestry',
      sortField: 'title',
      firstDirection: 'asc',
      render: (t) => <TapestryTitle tapestry={t} />,
    },
    {
      key: 'owner',
      label: 'Owner',
      render: (t) => (
        <div className={styles.owner}>
          <Link
            to={presetFilterPath('users', { 'id:eq': t.owner.id }, `Showing @${t.owner.username}`)}
            className={common.underlinedLink}
          >
            @{t.owner.username}
          </Link>
          <span className={clsx(common.muted, styles.contact)}>{contactLine(t.owner)}</span>
        </div>
      ),
    },
    { key: 'sharing', label: 'Sharing', render: (t) => <SharingLevelLabel tapestry={t} /> },
    {
      key: 'items',
      label: 'Items',
      sortField: 'items._count',
      align: 'right',
      render: (t) => t.itemCount.toLocaleString(),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortField: 'createdAt',
      nowrap: true,
      render: (t) => <span className={styles.date}>{formatDate(t.createdAt)}</span>,
    },
    {
      key: 'updatedAt',
      label: 'Last updated',
      sortField: 'updatedAt',
      nowrap: true,
      render: (t) => <span className={styles.date}>{formatDate(t.updatedAt)}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      hideLabel: true,
      render: (t) => (
        <ActionsMenu
          label={`More actions for “${t.title}”`}
          items={[
            { key: 'details', label: 'View details', to: adminPath('tapestries', t.id) },
            t.featured
              ? {
                  key: 'unfeature',
                  label: 'Remove from Gallery',
                  onSelect: () => unfeature(t).catch(() => undefined),
                }
              : {
                  key: 'feature',
                  label: 'Feature in Gallery…',
                  disabled: t.sharingLevel !== 'link',
                  hint:
                    t.sharingLevel !== 'link'
                      ? 'Only “Anyone with the link” tapestries can be featured, and only the owner can change sharing'
                      : undefined,
                  onSelect: () => setFeaturing(t),
                },
            {
              key: 'owner',
              label: 'View owner’s tapestries',
              to: presetFilterPath(
                'tapestries',
                { 'ownerId:eq': t.owner.id },
                `Showing tapestries owned by @${t.owner.username}`,
              ),
            },
            {
              key: 'delete',
              label: 'Delete permanently…',
              danger: true,
              separated: true,
              onSelect: () => setDeleting(t),
            },
          ]}
        />
      ),
    },
  ]

  const first = total ? page * pageSize + 1 : 0
  const last = Math.min(total ?? 0, (page + 1) * pageSize)

  return (
    <>
      <PageHeader
        title="All tapestries"
        description="Tapestries shared as “Anyone with the link”, plus Owner only and Invited people tapestries that you own or were invited to. Other private tapestries aren’t shown to admins. Only owners change sharing; admins can feature tapestries shared as “Anyone with the link” and remove them from the Gallery. Opening a tapestry is recorded in the activity log and never counts as user activity."
        actions={
          <Button variant="secondary" icon="download" disabled={exporting} onClick={exportCsv}>
            {exporting ? 'Exporting…' : 'Export view as CSV'}
          </Button>
        }
      />
      <ErrorText error={exportError} />
      {notice}
      {deletedTitle && (
        <Notice tone="success" onDismiss={() => setDeletedTitle(null)}>
          “{deletedTitle}” was permanently deleted. The deletion is recorded in the activity log.
        </Notice>
      )}
      {preset && (
        <Notice tone="info" actions={<NoticeButton onClick={clearPreset}>Show all</NoticeButton>}>
          {presetLabel}
        </Notice>
      )}

      <Panel flush aria-labelledby="results-heading">
        <div className={styles.filters}>
          <FilterBar>
            <Field label="Search" grow={2}>
              <SearchInput value={search} onSearch={setSearch} placeholder="Title, slug or owner" />
            </Field>
            <Field label="Sharing">
              <Select<SharingLevel | ''>
                value={sharingLevel}
                onChange={setSharingLevel}
                options={[
                  { value: '', label: 'All sharing levels' },
                  { value: 'owner', label: SHARING_LEVEL_LABELS.owner },
                  { value: 'invited', label: SHARING_LEVEL_LABELS.invited },
                  { value: 'link', label: SHARING_LEVEL_LABELS.link },
                ]}
              />
            </Field>
            <Field label="Featured">
              <Select<'' | 'true' | 'false'>
                value={featured}
                onChange={setFeatured}
                options={[
                  { value: '', label: 'All' },
                  { value: 'true', label: 'Featured' },
                  { value: 'false', label: 'Not featured' },
                ]}
              />
            </Field>
            <Field label="Owner">
              <TextInput
                value={owner}
                placeholder="Any owner"
                onChange={(e) => setOwner(e.target.value)}
              />
            </Field>
            <FieldGroup label="Date" grow={1.3}>
              <Select<DateField>
                aria-label="Date field"
                value={dateField}
                onChange={setDateField}
                options={[
                  { value: 'updatedAt', label: 'Updated' },
                  { value: 'createdAt', label: 'Created' },
                ]}
              />
              <Select<DateRange>
                aria-label="Date range"
                value={dateRange}
                onChange={setDateRange}
                options={[
                  { value: '', label: 'Any time' },
                  { value: '7', label: 'Last 7 days' },
                  { value: '30', label: 'Last 30 days' },
                  { value: '90', label: 'Last 90 days' },
                  { value: 'custom', label: 'Custom range…' },
                ]}
              />
            </FieldGroup>
            {dateRange === 'custom' && (
              <>
                <Field label="From">
                  <TextInput
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </Field>
                <Field label="To">
                  <TextInput
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </Field>
              </>
            )}
            <button
              type="button"
              className={styles.clearFilters}
              disabled={!filtersActive}
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </FilterBar>
        </div>

        <div className={styles.summary}>
          <h2 id="results-heading">
            {total === undefined
              ? 'Loading tapestries…'
              : `Showing ${first}–${last} of ${pluralize(total, 'tapestry', 'tapestries')}${filtersActive || preset ? ' matching these filters' : ''}`}
          </h2>
          <span>Sorted by {describeSort(sort)}</span>
        </div>

        <ErrorText error={list.error} />
        <DataTable
          caption="Tapestries"
          columns={columns}
          rows={rows}
          rowKey={(t) => t.id}
          sort={sort}
          onSort={list.setSort}
          loading={list.loading}
          minWidth={1000}
          className={styles.table}
          empty={
            <EmptyState
              title="No tapestries match these filters"
              action={
                filtersActive && (
                  <Button variant="secondary" size="small" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )
              }
            >
              Try a different search term, or clear the filters to see every tapestry.
            </EmptyState>
          }
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
        />
      </Panel>

      {featuring && (
        <FeatureDialog
          tapestry={featuring}
          onCancel={() => setFeaturing(null)}
          onConfirm={async () => {
            try {
              await feature(featuring)
            } finally {
              setFeaturing(null)
            }
          }}
        />
      )}
      {deleting && (
        <DeleteTapestryDialog
          tapestry={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={() => {
            setDeletedTitle(deleting.title)
            setDeleting(null)
            list.reload()
          }}
        />
      )}
    </>
  )
}
