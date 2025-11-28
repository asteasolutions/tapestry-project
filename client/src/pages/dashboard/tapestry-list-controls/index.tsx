import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { LazyListLoader } from '../../../components/lazy-list/lazy-list-loader'
import { SearchInput } from 'tapestry-core-client/src/components/lib/search-input/index'
import { SortDirection } from 'tapestry-shared/src/data-transfer/resources/dtos/common'
import { DashboardSection, GUEST_SORT_BY, SortBy } from '..'
import styles from '../styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { userSettings } from '../../../services/user-settings'
import { Select } from '../../../components/select'
import { ReactNode } from 'react'
import { Options } from 'react-select'
import { useSession } from '../../../layouts/session'

interface SortOption {
  value: SortBy
  label: ReactNode
}

const CUSTOM_LABELS: Partial<Record<DashboardSection, { latest: string }>> = {
  shared: {
    latest: 'Last shared',
  },
}
function getSortOptions(section: DashboardSection, isLoggedIn: boolean): Options<SortOption> {
  const sortOptions: Options<SortOption> = [
    {
      label: <Text variant="bodySm">{CUSTOM_LABELS[section]?.latest ?? 'Last created'}</Text>,
      value: 'latest',
    },
    { label: <Text variant="bodySm">Title</Text>, value: 'title' },
    { label: <Text variant="bodySm">Recently opened</Text>, value: 'lastSeen' },
  ]
  return sortOptions.filter((option) => isLoggedIn || GUEST_SORT_BY.includes(option.value))
}

interface TapestryListControlsProps {
  section: DashboardSection
  tapestryListState: LazyListLoader<TapestryDto>['_value'] | undefined
  onSearchChanged: (query: string) => unknown
  sortDirection: SortDirection
  onSortDirectionChanged: (direction: SortDirection) => unknown
  sortCriterion: SortBy
  onSortCriterionChanged: (direction: SortBy) => unknown
}

export function TapestryListControls({
  section,
  tapestryListState,
  onSearchChanged,
  sortDirection,
  onSortDirectionChanged,
  sortCriterion,
  onSortCriterionChanged,
}: TapestryListControlsProps) {
  const { user } = useSession()

  return (
    <div className={styles.mainContentHeader}>
      <SearchInput
        isLoading={tapestryListState?.state === 'initial-load'}
        className={styles.searchInput}
        placeholder="Search by name..."
        onSearch={onSearchChanged}
      />
      <div className={styles.listControls}>
        <Text variant="bodySm" className={styles.foundLabel}>
          {tapestryListState &&
            `${tapestryListState.total || 'No'} ${tapestryListState.total === 1 ? 'tapestry' : 'tapestries'}`}
        </Text>
        <div className={styles.sortControls}>
          <IconButton
            icon={sortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward'}
            aria-label={sortDirection === 'desc' ? 'Descending' : 'Ascending'}
            onClick={() => {
              const direction = sortDirection === 'asc' ? 'desc' : 'asc'
              onSortDirectionChanged(direction)
              userSettings.update({ sortDirection: direction })
            }}
          />
          <Select
            options={getSortOptions(section, !!user)}
            value={sortCriterion}
            onChange={(o) => {
              onSortCriterionChanged(o!.value)
              userSettings.update({ sortBy: o!.value })
            }}
            styles={{ menu: (defaultStyles) => ({ ...defaultStyles, right: 0 }) }}
          />
        </div>
      </div>
    </div>
  )
}
