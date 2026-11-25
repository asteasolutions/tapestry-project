import clsx from 'clsx'
import { PAGE_SIZES } from '../../use-admin-list'
import { Select } from '../field'
import styles from './styles.module.css'

/** Page numbers to show: the first, the last and the ones around the current page. */
function visiblePages(page: number, pageCount: number): (number | null)[] {
  const pages: (number | null)[] = []
  for (let i = 0; i < pageCount; i++) {
    if (i === 0 || i === pageCount - 1 || Math.abs(i - page) <= 1) {
      pages.push(i)
    } else if (pages.at(-1) !== null) {
      pages.push(null)
    }
  }
  return pages
}

interface PaginationProps {
  page: number
  pageSize: number
  total: number | undefined
  onPageChange: (page: number) => unknown
  onPageSizeChange: (pageSize: number) => unknown
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (total === undefined) return null
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <nav className={styles.root} aria-label="Pagination">
      <label className={styles.pageSize}>
        Rows per page
        <Select
          value={String(pageSize)}
          options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
          onChange={(size) => onPageSizeChange(Number(size))}
        />
      </label>
      <div className={styles.pages}>
        <button
          type="button"
          className={styles.step}
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        {visiblePages(page, pageCount).map((p, index) =>
          p === null ? (
            <span key={`gap-${index}`} aria-hidden className={styles.gap}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={clsx(styles.page, { [styles.current]: p === page })}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p + 1}`}
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </button>
          ),
        )}
        <button
          type="button"
          className={styles.step}
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  )
}
