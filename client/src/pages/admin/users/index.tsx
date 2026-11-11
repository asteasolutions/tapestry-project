import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { AdminUserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { UserRole } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { listAll, resource } from '../../../services/rest-resources'
import { PageHeader } from '../components/page-header'
import { Panel } from '../components/panel'
import { Notice, NoticeButton } from '../components/notice'
import { ErrorText } from '../components/error-text'
import { Field, FilterBar, SearchInput, Select } from '../components/field'
import { Column, DataTable, EmptyState } from '../components/data-table'
import { Pagination } from '../components/pagination'
import { UserIdentity } from '../components/user-identity'
import { csvDate, downloadCsv } from '../csv'
import { formatDate, loginProfiles, pluralize } from '../format'
import { cleanFilter, useAdminList } from '../use-admin-list'
import { presetFilterPath, usePresetFilter } from '../use-preset-filter'
import { RoleSelect, ROLE_OPTIONS } from './role-select'
import { AssignRoleForm } from './assign-role-form'
import common from '../common.module.css'
import styles from './styles.module.css'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { fileName } from '../reports/report-csv'

const PROVIDER_OPTIONS = [
  { value: '', label: 'Any provider' },
  { value: 'google', label: 'Google' },
  { value: 'orcid', label: 'ORCID' },
  { value: 'wikimedia', label: 'Wikimedia' },
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'ia', label: 'Internet Archive' },
] as const

function downloadUsersCSV(users: AdminUserDto[]) {
  downloadCsv(
    fileName('users'),
    [
      'Username',
      'Given name',
      'Family name',
      'Email',
      'Avatar',
      'Google ID',
      'ORCID iD',
      'Wikimedia ID',
      'Bluesky DID',
      'Role',
      'Created',
      'Tapestries',
    ],
    users.map((u) => [
      u.username,
      u.givenName,
      u.familyName,
      u.email,
      u.avatar,
      u.gsiUserId,
      u.orcidId,
      u.wikimediaId,
      u.blueskyDid,
      u.role,
      csvDate(u.createdAt),
      u.tapestryCount,
    ]),
  )
}

type ProviderFilter = (typeof PROVIDER_OPTIONS)[number]['value']

function LoginProviders({ user }: { user: AdminUserDto }) {
  const profiles = loginProfiles(user)
  if (profiles.length === 0) return <span className={common.muted}>—</span>
  return (
    <div className={styles.providers}>
      {profiles.map((profile) => (
        <span key={profile.provider}>
          {profile.provider}:{' '}
          {profile.url ? (
            <a href={profile.url} target="_blank" rel="noreferrer">
              {profile.id}
            </a>
          ) : (
            <span className={common.mono}>{profile.id}</span>
          )}
        </span>
      ))}
    </div>
  )
}

export function AdminUsers() {
  const { preset, label: presetLabel, clear: clearPreset } = usePresetFilter()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [provider, setProvider] = useState<ProviderFilter>('')

  const [updates, setUpdates] = useState<Record<string, AdminUserDto>>({})

  const filtersActive = !!search.trim() || !!role || !!provider
  const list = useAdminList(
    (query, signal) => resource('adminUsers').list(query, { signal }),
    cleanFilter({
      ...preset,
      'search:icontains': search.trim(),
      'role:eq': role,
      'provider:eq': provider,
    }),
    { field: 'createdAt', direction: 'desc' },
  )
  const { data, query } = list
  const rows = data?.data.map((u) => updates[u.id] ?? u)
  const total = data?.total

  const {
    loading: exporting,
    error: exportError,
    trigger: exportCsv,
  } = useAsyncAction(async ({ signal }) =>
    downloadUsersCSV(await listAll(resource('adminUsers'), query, signal)),
  )

  const columns: Column<AdminUserDto>[] = [
    {
      key: 'user',
      label: 'User',
      sortField: 'username',
      firstDirection: 'asc',
      render: (u) => <UserIdentity user={u} />,
    },
    { key: 'providers', label: 'Login providers', render: (u) => <LoginProviders user={u} /> },
    {
      key: 'role',
      label: 'Role',
      sortField: 'role',
      render: (u) => (
        <RoleSelect
          user={u}
          onUpdated={(updated) => setUpdates((c) => ({ ...c, [u.id]: updated }))}
        />
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      sortField: 'createdAt',
      nowrap: true,
      render: (u) => formatDate(u.createdAt),
    },
    {
      key: 'tapestries',
      label: 'Tapestries',
      sortField: 'tapestries._count',
      align: 'right',
      render: (u) => (
        <Link
          to={presetFilterPath(
            'tapestries',
            { 'ownerId:eq': u.id },
            `Showing tapestries owned by @${u.username}`,
          )}
        >
          {u.tapestryCount}
        </Link>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account on this instance with all of its stored identifiers. Email is optional, so ORCID and Wikimedia users may have none. Last sign-in is not recorded."
        actions={
          <Button variant="secondary" icon="download" disabled={exporting} onClick={exportCsv}>
            {exporting ? 'Exporting…' : 'Export view as CSV'}
          </Button>
        }
      />
      <ErrorText error={exportError} />
      {preset && (
        <Notice tone="info" actions={<NoticeButton onClick={clearPreset}>Show all</NoticeButton>}>
          {presetLabel}
        </Notice>
      )}
      <AssignRoleForm
        onAssigned={() => {
          setUpdates({})
          list.reload()
        }}
      />

      <Panel flush aria-labelledby="users-heading">
        <div className={styles.filters}>
          <FilterBar>
            <Field label="Search" grow={2}>
              <SearchInput
                value={search}
                onSearch={setSearch}
                placeholder="Username, name or email"
              />
            </Field>
            <Field label="Role">
              <Select<UserRole | ''>
                value={role}
                onChange={setRole}
                options={[{ value: '', label: 'Any role' }, ...ROLE_OPTIONS]}
              />
            </Field>
            <Field label="Login provider">
              <Select<ProviderFilter>
                value={provider}
                onChange={setProvider}
                options={PROVIDER_OPTIONS}
              />
            </Field>
          </FilterBar>
        </div>
        <h2 id="users-heading" className={styles.summary}>
          {total === undefined ? 'Loading users…' : pluralize(total, 'user')}
        </h2>
        <ErrorText error={list.error} />
        <DataTable
          caption="Users"
          columns={columns}
          rows={rows}
          rowKey={(u) => u.id}
          sort={list.sort}
          onSort={list.setSort}
          loading={list.loading}
          empty={
            <EmptyState title="No users match these filters">
              {filtersActive && 'Try a different search term or filter.'}
            </EmptyState>
          }
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
