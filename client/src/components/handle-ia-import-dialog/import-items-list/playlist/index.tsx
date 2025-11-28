import { secondsToHours, secondsToMinutes } from 'date-fns'
import { secondsInHour, secondsInMinute } from 'date-fns/constants'
import { ImportItemsListProps } from '..'
import { PlaylistEntry } from '../../../../pages/tapestry/view-model'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import { SelectAll } from '../select-all'
import { MAX_SELECTION } from '../..'

function formatDuration(durationSeconds: number) {
  durationSeconds = Math.floor(durationSeconds)
  const hours = secondsToHours(durationSeconds)
  const minutes = secondsToMinutes(durationSeconds % secondsInHour)
  const seconds = durationSeconds % secondsInMinute
  return `${hours > 0 ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

interface IAPlaylistEntriesProps extends Omit<ImportItemsListProps, 'iaImport'> {
  entries: PlaylistEntry[]
}

export function IAPlaylistEntries({
  onSelect,
  onToggleAll,
  entries,
  selectedItems,
  header,
}: IAPlaylistEntriesProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  const selectedCount = selectedItems.length
  const hasSelection = selectedCount > 0

  return (
    <div className={styles.root}>
      {header}
      <SelectAll
        classes={{ root: styles.selectAll, checkbox: styles.checkbox }}
        checked={hasSelection}
        onChange={() => onToggleAll(!hasSelection)}
        total={entries.length}
        textVariant={textVariant}
      />
      {entries.map((entry, index) => {
        const checked = !!selectedItems.find((i) => i.id === entry.filename)
        return (
          <div key={entry.filename}>
            <Checkbox
              checked={checked}
              onChange={() => onSelect({ id: entry.filename })}
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
