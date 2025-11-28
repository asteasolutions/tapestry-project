import clsx from 'clsx'
import { useRef, useState } from 'react'
import { useTapestryConfig } from '../..'
import { IconButton } from '../../../../../src/components/lib/buttons/index'
import { Icon } from '../../../../../src/components/lib/icon/index'
import { Input } from '../../../../../src/components/lib/input/index'
import { TabPanel } from '../../../../../src/components/lib/tab-panel/index'
import { Text } from '../../../../../src/components/lib/text/index'
import {
  setSearchTerm,
  setSidePane,
  toggleOutline,
} from '../../../../view-model/store-commands/tapestry'
import { NoResults } from './no-results'
import { SearchResult } from './search-result'
import styles from './styles.module.css'
import { useOutlineIntersection } from './use-outline-intersection'
import { useSearchResults } from './use-search-results'

function truncateCount(count: number) {
  return count > 99 ? '99+' : count
}

interface TabProps {
  children: string
  count: number
}

function Tab({ children, count }: TabProps) {
  return (
    <Text variant="bodySm" className={styles.tab}>
      {children}{' '}
      <Text variant="bodyXs" className={styles.tabCount}>
        {truncateCount(count)}
      </Text>
    </Text>
  )
}

export type Tab = 'all' | 'items' | 'text'

export function SearchPane() {
  const { useDispatch } = useTapestryConfig()

  const [search, setSearch] = useState('')
  const [selectedTab, setSelectedTab] = useState<Tab>('all')
  const [clickedItem, setClickedItem] = useState<string>()

  const dispatch = useDispatch()

  const grouped = useSearchResults(search, (id) => {
    setClickedItem(id)
  })
  const total = grouped.all.length

  const handleClose = () => {
    dispatch(setSearchTerm(null), toggleOutline(null), setSidePane(null))
  }

  const ref = useRef<HTMLDivElement>(null)

  const hasIntersection = useOutlineIntersection(ref)

  if (
    (selectedTab === 'text' && grouped.text.length === 0) ||
    (selectedTab === 'items' && grouped.items.length === 0)
  ) {
    setSelectedTab('all')
  }

  return (
    <div
      className={clsx(styles.root, {
        [styles.transparent]: hasIntersection,
      })}
      ref={ref}
    >
      <div className={styles.searchContainer}>
        <Icon
          icon="feature_search"
          style={!search ? { color: 'var(--theme-text-tertiary)' } : undefined}
        />
        <Input
          autoFocus
          placeholder='Search by keyword (e.g. "image")'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            dispatch(setSearchTerm(e.target.value))
          }}
          className={styles.searchInput}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleClose()
            }
          }}
        />
        <IconButton icon="close" aria-label="Close search" size="small" onClick={handleClose} />
      </div>
      <div className={styles.resultsContainer}>
        <hr className={styles.separator} />
        <TabPanel
          tabs={{
            all: <Tab count={total}>All</Tab>,
            items: grouped.items.length > 0 && <Tab count={grouped.items.length}>Items</Tab>,
            text: grouped.text.length > 0 && <Tab count={grouped.text.length}>Text</Tab>,
          }}
          selected={selectedTab}
          onSelect={setSelectedTab}
          className={styles.tabs}
        />
        {total > 0 ? (
          <div className={styles.searchResults}>
            {grouped[selectedTab].map((result) => (
              <SearchResult key={result.id} {...result} highlighted={result.id === clickedItem} />
            ))}
          </div>
        ) : (
          <NoResults query={search} />
        )}
      </div>
    </div>
  )
}
