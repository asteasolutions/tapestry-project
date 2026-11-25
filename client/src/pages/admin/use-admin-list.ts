import { useMemo, useState } from 'react'
import { noop } from 'lodash-es'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import {
  ListParamsInputDto,
  ListResponseDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/common'

export const PAGE_SIZES = [10, 25, 50, 100] as const

export type ListFilter = NonNullable<ListParamsInputDto['filter']>

export interface Sort {
  field: string
  direction: 'asc' | 'desc'
}

export function sortParam({ field, direction }: Sort) {
  return `${direction === 'desc' ? '-' : ''}${field}`
}

/** Removes empty filter values, so that they are not sent to the server. */
export function cleanFilter(filter: Record<string, string | string[] | undefined>): ListFilter {
  return Object.fromEntries(
    Object.entries(filter).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : value !== undefined && value !== '',
    ),
  ) as ListFilter
}

/**
 * Server-side paginated list with filters and sorting. Changing the filter, the sort order or the
 * page size returns to the first page.
 */
export function useAdminList<T>(
  fetchPage: (
    query: Required<Pick<ListParamsInputDto, 'filter' | 'orderBy' | 'skip' | 'limit'>>,
    signal: AbortSignal,
  ) => Promise<ListResponseDto<T>>,
  filter: ListFilter,
  initialSort: Sort,
) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(25)
  const [sort, setSort] = useState(initialSort)
  const filterKey = JSON.stringify(filter)

  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey)
    setPage(0)
  }

  const query = useMemo(
    () => ({
      filter: JSON.parse(filterKey) as ListFilter,
      orderBy: sortParam(sort),
      skip: page * pageSize,
      limit: pageSize,
    }),
    [filterKey, sort, page, pageSize],
  )

  const { data, loading, error, reload } = useAsync(
    ({ signal }) => fetchPage(query, signal),
    // fetchPage is expected to be stable for the lifetime of the list
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query],
    { clearDataOnReload: false },
  )

  return {
    data,
    loading,
    error,
    reload: () => reload(noop),
    page,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size)
      setPage(0)
    },
    sort,
    setSort: (next: Sort) => {
      setSort(next)
      setPage(0)
    },
    query,
  }
}
