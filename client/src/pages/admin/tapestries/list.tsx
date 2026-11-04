import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { SearchInput } from 'tapestry-core-client/src/components/lib/search-input/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import {
  AdminTapestryDto,
  SharingLevel,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { listAll, resource } from '../../../services/rest-resources'
import { adminPath, tapestryPath } from '../../../utils/paths'
import {
  Column,
  DataTable,
  DateInput,
  ErrorText,
  FilterField,
  NativeSelect,
  Pagination,
  PresetFilterNotice,
  SectionHeader,
} from '../components'
import { csvDate, downloadCsv } from '../csv'
import { dayStart, formatDate, SHARING_LEVEL_LABELS, tapestryUrl } from '../format'
import { cleanFilter, ListFilter, useAdminList } from '../use-admin-list'
import { DeleteTapestryDialog, SharingControls } from './sharing-controls'
import styles from '../styles.module.css'

/** A fixed filter passed in the URL, e.g. when drilling through from a report. */
export function usePresetFilter() {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('filter')
  const preset = useMemo(() => {
    if (!raw) return null
    try {
      return JSON.parse(raw) as ListFilter
    } catch {
      return null
    }
  }, [raw])

  return {
    preset,
    label: searchParams.get('label') ?? 'Showing a filtered list',
    clear: () => setSearchParams({}),
  }
}

export function AdminTapestryList() {
  const { preset, label, clear } = usePresetFilter()
  const [search, setSearch] = useState('')
  const [sharingLevel, setSharingLevel] = useState<SharingLevel | ''>('')
  const [featured, setFeatured] = useState<'' | 'true' | 'false'>('')
  const [owner, setOwner] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [updatedFrom, setUpdatedFrom] = useState('')
  const [updatedTo, setUpdatedTo] = useState('')
  const [deleting, setDeleting] = useState<AdminTapestryDto | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<unknown>()
  const [updates, setUpdates] = useState<Record<string, AdminTapestryDto>>({})

  const filter = cleanFilter({
    ...preset,
    'search:icontains': search.trim(),
    'sharingLevel:eq': sharingLevel,
    'featured:eq': featured,
    'owner:icontains': owner.trim(),
    'createdAt:gte': dayStart(createdFrom),
    'createdAt:lt': dayStart(createdTo, 1),
    'updatedAt:gte': dayStart(updatedFrom),
    'updatedAt:lt': dayStart(updatedTo, 1),
  })

  const list = useAdminList(
    (query, signal) => resource('adminTapestries').list(query, { signal }),
    filter,
    { field: 'updatedAt', direction: 'desc' },
  )
  const rows = list.data?.data.map((t) => updates[t.id] ?? t)

  const onUpdated = (tapestry: AdminTapestryDto) =>
    setUpdates((current) => ({ ...current, [tapestry.id]: tapestry }))

  async function exportCsv() {
    setExporting(true)
    setExportError(undefined)
    try {
      const all = await listAll(resource('adminTapestries'), {
        filter: list.query.filter,
        orderBy: list.query.orderBy,
      })
      downloadCsv(
        `tapestries-${new Date().toISOString().slice(0, 10)}`,
        [
          'Title',
          'Slug',
          'Owner username',
          'Owner email',
          'Sharing level',
          'Featured',
          'Items',
          'Created',
          'Last updated',
          'URL',
        ],
        all.map((t) => [
          t.title,
          t.slug,
          t.owner.username,
          t.owner.email,
          SHARING_LEVEL_LABELS[t.sharingLevel],
          t.featured ? 'Yes' : 'No',
          t.itemCount,
          csvDate(t.createdAt),
          csvDate(t.updatedAt),
          tapestryUrl(t.owner.username, t.slug),
        ]),
      )
    } catch (e) {
      setExportError(e)
    } finally {
      setExporting(false)
    }
  }

  const columns: Column<AdminTapestryDto>[] = [
    {
      key: 'title',
      label: 'Title',
      sortField: 'title',
      render: (t) => <Link to={adminPath('tapestries', t.id)}>{t.title}</Link>,
    },
    { key: 'slug', label: 'Slug', sortField: 'slug', render: (t) => <code>{t.slug}</code> },
    {
      key: 'owner',
      label: 'Owner',
      sortField: 'owner.username',
      render: (t) => (
        <div>
          <Text variant="bodySm" component="div">
            {t.owner.username}
          </Text>
          {/* Email can be empty depending on the sign-in provider */}
          {t.owner.email && (
            <Text variant="bodyXs" component="div" className={styles.muted}>
              {t.owner.email}
            </Text>
          )}
        </div>
      ),
    },
    {
      key: 'sharing',
      label: 'Sharing · Featured',
      render: (t) => <SharingControls tapestry={t} onUpdated={onUpdated} compact />,
    },
    {
      key: 'items',
      label: 'Items',
      sortField: 'items._count',
      className: styles.numeric,
      render: (t) => t.itemCount,
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortField: 'createdAt',
      className: styles.nowrap,
      render: (t) => formatDate(t.createdAt),
    },
    {
      key: 'updatedAt',
      label: 'Last updated',
      sortField: 'updatedAt',
      className: styles.nowrap,
      render: (t) => formatDate(t.updatedAt),
    },
    {
      key: 'url',
      label: 'URL',
      render: (t) => (
        <a href={tapestryPath(t.owner.username, t.slug)} target="_blank" rel="noreferrer">
          /u/{t.owner.username}/{t.slug}
        </a>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (t) => (
        <Button
          variant="tertiary-negative"
          size="small"
          icon="delete"
          onClick={() => setDeleting(t)}
        >
          Delete
        </Button>
      ),
    },
  ]

  return (
    <>
      <SectionHeader
        title="All tapestries"
        description="Every tapestry on this instance, including private ones."
        actions={
          <Button variant="secondary" icon="download" disabled={exporting} onClick={exportCsv}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />
      <ErrorText error={exportError} />
      {preset && <PresetFilterNotice text={label} onClear={clear} />}
      <div className={styles.filters}>
        <SearchInput
          className={styles.search}
          placeholder="Search title, slug or owner…"
          aria-label="Search tapestries"
          onSearch={setSearch}
        />
        <FilterField label="Sharing level">
          <NativeSelect<SharingLevel | ''>
            value={sharingLevel}
            onChange={setSharingLevel}
            options={[
              { value: '', label: 'Any' },
              { value: 'owner', label: SHARING_LEVEL_LABELS.owner },
              { value: 'invited', label: SHARING_LEVEL_LABELS.invited },
              { value: 'link', label: SHARING_LEVEL_LABELS.link },
            ]}
          />
        </FilterField>
        <FilterField label="Featured">
          <NativeSelect<'' | 'true' | 'false'>
            value={featured}
            onChange={setFeatured}
            options={[
              { value: '', label: 'Any' },
              { value: 'true', label: 'Featured' },
              { value: 'false', label: 'Not featured' },
            ]}
          />
        </FilterField>
        <FilterField label="Owner">
          <input
            className={styles.select}
            value={owner}
            placeholder="Username or email"
            onChange={(e) => setOwner(e.target.value)}
          />
        </FilterField>
        <FilterField label="Created from">
          <DateInput value={createdFrom} onChange={setCreatedFrom} ariaLabel="Created from" />
        </FilterField>
        <FilterField label="Created to">
          <DateInput value={createdTo} onChange={setCreatedTo} ariaLabel="Created to" />
        </FilterField>
        <FilterField label="Updated from">
          <DateInput value={updatedFrom} onChange={setUpdatedFrom} ariaLabel="Updated from" />
        </FilterField>
        <FilterField label="Updated to">
          <DateInput value={updatedTo} onChange={setUpdatedTo} ariaLabel="Updated to" />
        </FilterField>
      </div>
      <ErrorText error={list.error} />
      <DataTable
        caption="Tapestries"
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        sort={list.sort}
        onSort={list.setSort}
        loading={list.loading}
        emptyText="No tapestries match these filters"
      />
      <Pagination page={list.page} total={list.data?.total} onPageChange={list.setPage} />
      {deleting && (
        <DeleteTapestryDialog
          tapestry={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null)
            list.reload()
          }}
        />
      )}
    </>
  )
}
