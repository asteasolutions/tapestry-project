import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { adminPath } from '../../utils/paths'
import { ListFilter } from './use-admin-list'

/** Links to an admin list with a fixed filter, e.g. to drill through from a report. */
export function presetFilterPath(
  section: 'tapestries' | 'users',
  filter: ListFilter,
  label: string,
) {
  return adminPath(
    section,
    undefined,
    new URLSearchParams({ filter: JSON.stringify(filter), label }),
  )
}

/** A fixed filter passed in the URL by `presetFilterPath`. */
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
