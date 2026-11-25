import { ReactNode } from 'react'
import clsx from 'clsx'
import { Sort } from '../../use-admin-list'
import common from '../../common.module.css'
import styles from './styles.module.css'
import { PropsWithStyle } from 'tapestry-core-client/src/components/lib'

export interface Column<T> {
  key: string
  label: string
  /** The server-side sort field, if the column can be sorted */
  sortField?: string
  /** The direction used when the column is first sorted */
  firstDirection?: Sort['direction']
  align?: 'left' | 'right'
  /** Hides the label visually, e.g. for an actions column */
  hideLabel?: boolean
  nowrap?: boolean
  render: (row: T) => ReactNode
}

interface DataTableProps<T> extends PropsWithStyle {
  caption: string
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  sort?: Sort
  onSort?: (sort: Sort) => unknown
  loading?: boolean
  /** Shown instead of the rows when there are none */
  empty?: ReactNode
  minWidth?: number
}

function SortIndicator({ sorted, direction }: { sorted: boolean; direction?: Sort['direction'] }) {
  return (
    <span aria-hidden className={clsx(styles.sortIndicator, { [styles.active]: sorted })}>
      {sorted ? (direction === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )
}

/** A table spanning the width of its panel. Sorting and paging are done by the server. */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  loading,
  empty = 'Nothing to show',
  minWidth = 760,
  className,
  style,
}: DataTableProps<T>) {
  return (
    <div
      className={clsx(styles.root, { [styles.loading]: loading }, className)}
      aria-busy={loading}
      style={style}
    >
      <table style={{ minWidth }}>
        <caption className={common.visuallyHidden}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const sorted = !!sort && column.sortField === sort.field
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={clsx({ [styles.right]: column.align === 'right' })}
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
                          direction: sorted
                            ? sort.direction === 'desc'
                              ? 'asc'
                              : 'desc'
                            : (column.firstDirection ?? 'desc'),
                        })
                      }
                    >
                      {column.label}
                      <SortIndicator sorted={sorted} direction={sort?.direction} />
                    </button>
                  ) : (
                    <span className={clsx({ [common.visuallyHidden]: column.hideLabel })}>
                      {column.label}
                    </span>
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
                <td
                  key={column.key}
                  className={clsx({
                    [styles.right]: column.align === 'right',
                    [styles.nowrap]: column.nowrap,
                  })}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows?.length === 0 && <div className={styles.empty}>{empty}</div>}
      {!rows && loading && <div className={styles.empty}>Loading…</div>}
    </div>
  )
}

/** The content of an empty table: a title, an explanation and an optional action. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>{title}</p>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
