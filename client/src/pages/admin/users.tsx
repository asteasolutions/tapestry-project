import { FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { SearchInput } from 'tapestry-core-client/src/components/lib/search-input/index'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { AdminUserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { UserRole } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { listAll, resource } from '../../services/rest-resources'
import { useSession } from '../../layouts/session'
import { auth } from '../../auth'
import { adminPath } from '../../utils/paths'
import {
  Column,
  DataTable,
  ErrorText,
  FilterField,
  NativeSelect,
  Pagination,
  PresetFilterNotice,
  SectionHeader,
  UserIdentity,
} from './components'
import { csvDate, downloadCsv } from './csv'
import { formatDate, loginProfiles } from './format'
import { cleanFilter, useAdminList } from './use-admin-list'
import { usePresetFilter } from './tapestries/list'
import styles from './styles.module.css'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user', label: 'Regular user' },
  { value: 'admin', label: 'Admin' },
]

const PROVIDER_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'google', label: 'Google' },
  { value: 'orcid', label: 'ORCID' },
  { value: 'wikimedia', label: 'Wikimedia' },
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'ia', label: 'Internet Archive' },
] as const

type ProviderFilter = (typeof PROVIDER_OPTIONS)[number]['value']

function LoginProviders({ user }: { user: AdminUserDto }) {
  const profiles = loginProfiles(user)
  if (profiles.length === 0) return <span className={styles.muted}>—</span>
  return (
    <div>
      {profiles.map((profile) => (
        <Text key={profile.provider} variant="bodyXs" component="div">
          {profile.provider}:{' '}
          {profile.url ? (
            <a href={profile.url} target="_blank" rel="noreferrer">
              {profile.id}
            </a>
          ) : (
            <code>{profile.id}</code>
          )}
        </Text>
      ))}
    </div>
  )
}

/** Changes a user's role, asking for confirmation before admins remove their own role. */
function RoleSelect({
  user,
  onUpdated,
}: {
  user: AdminUserDto
  onUpdated: (u: AdminUserDto) => unknown
}) {
  const currentUser = useSession().user
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const [confirmingSelfDemotion, setConfirmingSelfDemotion] = useState(false)
  const isSelf = currentUser?.id === user.id

  async function setRole(role: UserRole) {
    setBusy(true)
    setError(undefined)
    try {
      onUpdated(await resource('adminUsers').update({ id: user.id }, { role }))
      if (isSelf) {
        // Reload the session so that the admin panel is hidden right away
        await auth.refresh(true)
      }
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <NativeSelect<UserRole>
        ariaLabel={`Role of ${user.username}`}
        value={user.role}
        options={ROLE_OPTIONS}
        disabled={busy}
        onChange={(role) => {
          if (isSelf && role !== 'admin') setConfirmingSelfDemotion(true)
          else void setRole(role)
        }}
      />
      <ErrorText error={error} />
      {confirmingSelfDemotion && (
        <SimpleModal
          title="Remove your admin role?"
          cancel={{ onClick: () => setConfirmingSelfDemotion(false) }}
          confirm={{
            text: 'Remove my admin role',
            variant: 'primary-negative',
            onClick: () => {
              setConfirmingSelfDemotion(false)
              void setRole('user')
            },
          }}
        >
          <Text component="p">You will immediately lose access to the admin panel.</Text>
        </SimpleModal>
      )}
    </>
  )
}

/** Assigns a role to an existing user found by username or email. */
function AssignRoleForm({ onAssigned }: { onAssigned: () => unknown }) {
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState<UserRole>('admin')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const [message, setMessage] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = identifier.trim()
    if (!value) return
    setBusy(true)
    setError(undefined)
    setMessage('')
    try {
      const isEmail = value.includes('@')
      const { data } = await resource('adminUsers').list({
        filter: isEmail ? { 'email:istarts': value } : { 'username:eq': value },
        limit: 10,
      })
      const user = data.find((u) =>
        isEmail ? u.email?.toLowerCase() === value.toLowerCase() : u.username === value,
      )

      if (user) {
        await resource('adminUsers').update({ id: user.id }, { role })
        setMessage(`${user.username} is now ${role === 'admin' ? 'an admin' : 'a regular user'}.`)
      } else {
        throw new Error(
          isEmail
            ? `Nobody has signed in with the email “${value}”.`
            : `There is no user with the username “${value}”.`,
        )
      }
      setIdentifier('')
      onAssigned()
    } catch (e) {
      setError(e instanceof Error && !('data' in e) ? e.message : e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={styles.panel} onSubmit={submit} aria-labelledby="assign-role-heading">
      <Text variant="body" component="h2" id="assign-role-heading" style={{ fontWeight: 600 }}>
        Assign a role
      </Text>
      <div className={styles.filters}>
        <FilterField label="Username or email">
          <input
            className={styles.select}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="jane or jane@example.com"
            style={{ minWidth: 260 }}
          />
        </FilterField>
        <FilterField label="Role">
          <NativeSelect<UserRole> value={role} onChange={setRole} options={ROLE_OPTIONS} />
        </FilterField>
        <Button type="submit" disabled={busy || !identifier.trim()}>
          Assign
        </Button>
      </div>
      {message && (
        <Text variant="bodySm" component="p" role="status">
          {message}
        </Text>
      )}
      <ErrorText error={error} />
    </form>
  )
}

export function AdminUsers() {
  const { preset, label, clear } = usePresetFilter()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [provider, setProvider] = useState<ProviderFilter>('')
  const [updates, setUpdates] = useState<Record<string, AdminUserDto>>({})
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<unknown>()

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
  const rows = list.data?.data.map((u) => updates[u.id] ?? u)

  async function exportCsv() {
    setExporting(true)
    setExportError(undefined)
    try {
      const all = await listAll(resource('adminUsers'), {
        filter: list.query.filter,
        orderBy: list.query.orderBy,
      })
      downloadCsv(
        `users-${new Date().toISOString().slice(0, 10)}`,
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
        all.map((u) => [
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
    } catch (e) {
      setExportError(e)
    } finally {
      setExporting(false)
    }
  }

  const columns: Column<AdminUserDto>[] = [
    { key: 'user', label: 'User', sortField: 'username', render: (u) => <UserIdentity user={u} /> },
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
      label: 'Created',
      sortField: 'createdAt',
      className: styles.nowrap,
      render: (u) => formatDate(u.createdAt),
    },
    {
      key: 'tapestries',
      label: 'Tapestries',
      sortField: 'tapestries._count',
      className: styles.numeric,
      render: (u) => (
        <Link
          to={adminPath(
            'tapestries',
            undefined,
            new URLSearchParams({
              filter: JSON.stringify({ 'ownerId:eq': u.id }),
              label: `Showing tapestries owned by ${u.username}`,
            }),
          )}
        >
          {u.tapestryCount}
        </Link>
      ),
    },
  ]

  return (
    <>
      <SectionHeader
        title="Users"
        description="Every stored identifier for each account. Email is optional, so ORCID and Wikimedia users may have none. Last sign-in is not recorded."
        actions={
          <Button variant="secondary" icon="download" disabled={exporting} onClick={exportCsv}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />
      <AssignRoleForm
        onAssigned={() => {
          setUpdates({})
          list.reload()
        }}
      />
      <ErrorText error={exportError} />
      {preset && <PresetFilterNotice text={label} onClear={clear} />}
      <div className={styles.filters}>
        <SearchInput
          className={styles.search}
          placeholder="Search username, name or email…"
          aria-label="Search users"
          onSearch={setSearch}
        />
        <FilterField label="Role">
          <NativeSelect<UserRole | ''>
            value={role}
            onChange={setRole}
            options={[{ value: '', label: 'Any' }, ...ROLE_OPTIONS]}
          />
        </FilterField>
        <FilterField label="Login provider">
          <NativeSelect<ProviderFilter>
            value={provider}
            onChange={setProvider}
            options={[...PROVIDER_OPTIONS]}
          />
        </FilterField>
      </div>
      <ErrorText error={list.error} />
      <DataTable
        caption="Users"
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        sort={list.sort}
        onSort={list.setSort}
        loading={list.loading}
        emptyText="No users match these filters"
      />
      <Pagination page={list.page} total={list.data?.total} onPageChange={list.setPage} />
    </>
  )
}
