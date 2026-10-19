import { secondsToHours, secondsToMinutes } from 'date-fns'
import { secondsInHour, secondsInMinute } from 'date-fns/constants'
import { ImportItemsListProps } from '..'
import { CollectionImport } from '../../../../pages/tapestry/view-model'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import { SelectAll } from '../select-all'
import { MAX_SELECTION } from '../..'
import { createIAMediaItems } from '../../../../stage/item-factories'

function formatDuration(durationSeconds: number) {
  durationSeconds = Math.floor(durationSeconds)
  const hours = secondsToHours(durationSeconds)
  const minutes = secondsToMinutes(durationSeconds % secondsInHour)
  const seconds = durationSeconds % secondsInMinute
  return `${hours > 0 ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export type IAPlaylistImport = Extract<CollectionImport, { type: 'IAPlaylist' }>

interface IAPlaylistEntriesProps extends Omit<ImportItemsListProps, 'collectionImport'> {
  collectionImport: IAPlaylistImport
}

export function IAPlaylistEntries({
  selectedIndices,
  selectItems,
  deselectItem,
  deselectAllItems,
  createItemsFromSelectionRef,
  tapestryId,
  collectionImport,
  header,
}: IAPlaylistEntriesProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined
  const { entries } = collectionImport

  createItemsFromSelectionRef.current = async () => {
    const selected = [...selectedIndices].sort((a, b) => a - b).map((i) => entries[i])
    return createIAMediaItems(
      tapestryId,
      selected.map((entry) => ({
        id: collectionImport.id,
        mediaType: collectionImport.metadata.mediatype,
        pathParams: [encodeURIComponent(entry.filename)],
      })),
    )
  }

  const selectedCount = selectedIndices.size
  const hasSelection = selectedCount > 0

  return (
    <div className={styles.root}>
      {header}
      <SelectAll
        classes={{ root: styles.selectAll, checkbox: styles.checkbox }}
        checked={hasSelection}
        onChange={() =>
          hasSelection
            ? deselectAllItems()
            : selectItems(
                Array.from({ length: Math.min(entries.length, MAX_SELECTION) }, (_, i) => i),
              )
        }
        total={entries.length}
        textVariant={textVariant}
      />
      {entries.map((entry, index) => {
        const checked = selectedIndices.has(index)
        return (
          <div key={entry.filename}>
            <Checkbox
              checked={checked}
              onChange={() => (checked ? deselectItem(index) : selectItems([index]))}
              classes={{ checkbox: styles.checkbox }}
              disabled={!checked && selectedCount >= MAX_SELECTION}
              label={{
                content: (
                  <div className={styles.entry}>
                    <Text variant={textVariant} className={styles.index}>
                      {index + 1}.
                    </Text>
                    <Text variant={textVariant} lineClamp={2}>
                      {entry.title}
                    </Text>
                    <Text variant={textVariant} className={styles.duration}>
                      {formatDuration(entry.duration)}
                    </Text>
                  </div>
                ),
                position: 'after',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
