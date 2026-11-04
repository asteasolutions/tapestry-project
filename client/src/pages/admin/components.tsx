import { ReactNode, useState } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router'
import { Button, IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { AdminUserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { Sort, PAGE_SIZE } from './use-admin-list'
import { displayName, loginProfiles } from './format'
import { Avatar } from '../../components/avatar'
import { describeError } from '../../errors'
import styles from './styles.module.css'

// ---- Table ----

export interface Column<T> {
  key: string
  label: string
  /** The server-side sort field, if the column can be sorted */
  sortField?: string
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  sort?: Sort
  onSort?: (sort: Sort) => unknown
  loading?: boolean
  emptyText?: string
  caption: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  loading,
  emptyText = 'Nothing to show',
  caption,
}: DataTableProps<T>) {
  return (
    <div className={clsx(styles.tableContainer, { [styles.loading]: loading })}>
      <table className={styles.table}>
        <caption className={styles.visuallyHidden}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const sorted = sort && column.sortField === sort.field
              return (
                <th
                  key={column.key}
                  className={column.className}
                  aria-sort={
                    sorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {column.sortField && onSort ? (
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() =>
                        onSort({
                          field: column.sortField!,
                          direction: sorted && sort.direction === 'desc' ? 'asc' : 'desc',
                        })
                      }
                    >
                      {column.label}
                      <Icon
                        icon={
                          sorted && sort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'
                        }
                        className={clsx(styles.sortIcon, { [styles.active]: sorted })}
                      />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={column.className}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows?.length === 0 && (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {!rows && loading && <Text className={styles.empty}>Loading…</Text>}
    </div>
  )
}

export function Pagination({
  page,
  total,
  onPageChange,
  pageSize = PAGE_SIZE,
}: {
  page: number
  total: number | undefined
  onPageChange: (page: number) => unknown
  pageSize?: number
}) {
  if (total === undefined) return null
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : page * pageSize + 1
  const last = Math.min(total, (page + 1) * pageSize)

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <Text variant="bodySm" className={styles.muted}>
        {first}–{last} of {total}
      </Text>
      <IconButton
        icon="chevron_left"
        aria-label="Previous page"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      />
      <Text variant="bodySm">
        Page {page + 1} of {pageCount}
      </Text>
      <IconButton
        icon="chevron_right"
        aria-label="Next page"
        disabled={page >= pageCount - 1}
        onClick={() => onPageChange(page + 1)}
      />
    </nav>
  )
}

// ---- Layout pieces ----

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <Text variant="h6" component="h1">
          {title}
        </Text>
        {description && (
          <Text variant="bodySm" component="p" className={styles.muted}>
            {description}
          </Text>
        )}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'positive' | 'negative'
}) {
  return <span className={clsx(styles.badge, styles[tone])}>{children}</span>
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <Text variant="bodySm" textType="error" component="p" role="alert">
      {describeError(error)}
    </Text>
  )
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.filterField}>
      <Text variant="bodyXs" className={styles.muted}>
        {label}
      </Text>
      {children}
    </label>
  )
}

/** A native select; it supports keyboard use and works well inside dense tables. */
export function NativeSelect<V extends string>({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: V
  options: { value: V; label: string }[]
  onChange: (value: V) => unknown
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <select
      className={styles.select}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value as V)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function DateInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => unknown
  ariaLabel: string
}) {
  return (
    <input
      type="date"
      className={styles.select}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

/** Shown when a list was opened from a report or another record with a fixed filter. */
export function PresetFilterNotice({ text, onClear }: { text: string; onClear: () => unknown }) {
  return (
    <div className={styles.presetFilter}>
      <Icon icon="info" />
      <Text variant="bodySm">{text}</Text>
      <Button variant="link" size="small" onClick={onClear}>
        Clear
      </Button>
    </div>
  )
}

// ---- Users ----

export function UserIdentity({ user, linkTo }: { user: AdminUserDto; linkTo?: string }) {
  const name = displayName(user)
  return (
    <div className={styles.userIdentity}>
      <Avatar user={user} size="small" />
      <div>
        <Text variant="bodySm" component="div">
          {linkTo ? <Link to={linkTo}>{user.username}</Link> : user.username}
          {name !== user.username && <span className={styles.muted}> · {name}</span>}
        </Text>
        <Text variant="bodyXs" component="div" className={styles.muted}>
          {user.email ?? 'No email'}
        </Text>
      </div>
    </div>
  )
}

/** The contact route for a user: email if available, otherwise their login profile. */
export function ContactRoute({ user }: { user: AdminUserDto }) {
  if (user.email) {
    return <a href={`mailto:${user.email}`}>{user.email}</a>
  }
  const profiles = loginProfiles(user)
  if (profiles.length === 0) return <span className={styles.muted}>No contact details</span>
  return (
    <span>
      {profiles.map((profile, index) => (
        <span key={profile.provider}>
          {index > 0 && ', '}
          {profile.provider}:{' '}
          {profile.url ? (
            <a href={profile.url} target="_blank" rel="noreferrer">
              {profile.id}
            </a>
          ) : (
            <code>{profile.id}</code>
          )}
        </span>
      ))}
    </span>
  )
}

// ---- Confirmation ----

interface ConfirmDeletionModalProps {
  title: string
  children: ReactNode
  /** When set, the admin has to type this word to confirm */
  confirmationWord?: string
  confirmText?: string
  onConfirm: () => Promise<unknown>
  onCancel: () => unknown
}

export function ConfirmDeletionModal({
  title,
  children,
  confirmationWord,
  confirmText = 'Delete permanently',
  onConfirm,
  onCancel,
}: ConfirmDeletionModalProps) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const confirmed = !confirmationWord || typed.trim().toLowerCase() === confirmationWord

  return (
    <SimpleModal
      title={title}
      cancel={{ onClick: onCancel, disabled: busy }}
      confirm={{
        text: confirmText,
        variant: 'primary-negative',
        disabled: !confirmed || busy,
        onClick: async () => {
          setBusy(true)
          setError(undefined)
          try {
            await onConfirm()
          } catch (e) {
            setError(e)
            setBusy(false)
          }
        },
      }}
    >
      <div className={styles.modalBody}>
        {children}
        <Text component="p" style={{ fontWeight: 600 }}>
          This cannot be undone.
        </Text>
        {confirmationWord && (
          <Input
            label={<Text variant="bodySm">Type “{confirmationWord}” to confirm</Text>}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
          />
        )}
        <ErrorText error={error} />
      </div>
    </SimpleModal>
  )
}
