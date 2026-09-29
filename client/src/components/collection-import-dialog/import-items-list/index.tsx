import { ReactNode } from 'react'
import { ImportItems } from '..'
import { CollectionImport } from '../../../pages/tapestry/view-model'
import { OpenverseCollectionList } from './openverse-collection-list'
import { WikimediaCollectionList } from './wikimedia-collection-list'
import { IAPlaylistEntries } from './ia-playlist'
import { IASearchList } from './ia-search-list'

export interface ImportItemsListProps {
  onSelect: (item: ImportItems['itemsData'][number]) => unknown
  onSelectAll: (items: ImportItems['itemsData']) => unknown
  onDeselectAll: () => unknown
  collectionImport: CollectionImport
  selectedItems: ImportItems['itemsData']
  header?: ReactNode
}

// Each concrete list component below only ever handles the one CollectionImport type it's
// rendered for. CollectionImportDialog resets `selectedItems` whenever the active
// collectionImport changes, so these three props always agree with `collectionImport.type` at
// runtime -- even though TypeScript can't correlate two independently-unioned values through a
// switch on its own.
function narrowFor<T extends ImportItems['type']>({
  onSelect,
  onSelectAll,
  onDeselectAll,
  selectedItems,
}: Pick<ImportItemsListProps, 'onSelect' | 'onSelectAll' | 'onDeselectAll' | 'selectedItems'>) {
  return { onSelect, onSelectAll, onDeselectAll, selectedItems } as {
    onSelect: (item: Extract<ImportItems, { type: T }>['itemsData'][number]) => unknown
    onSelectAll: (items: Extract<ImportItems, { type: T }>['itemsData']) => unknown
    onDeselectAll: () => unknown
    selectedItems: Extract<ImportItems, { type: T }>['itemsData']
  }
}

export function ImportItemsList({ collectionImport, header, ...props }: ImportItemsListProps) {
  switch (collectionImport.type) {
    case 'IACollection':
      return (
        <IASearchList
          query={`collection:${collectionImport.id}`}
          emptyPlaceholder="No items in this collection"
          header={header}
          {...narrowFor<'IACollection'>(props)}
        />
      )
    case 'IASearchCollection':
      return (
        <IASearchList
          query={collectionImport.query}
          header={header}
          {...narrowFor<'IASearchCollection'>(props)}
        />
      )
    case 'OpenverseCollection':
      return (
        <OpenverseCollectionList
          collection={collectionImport}
          header={header}
          {...narrowFor<'OpenverseCollection'>(props)}
        />
      )
    case 'WikimediaCommonsCategory':
      return (
        <WikimediaCollectionList
          collection={collectionImport}
          header={header}
          {...narrowFor<'WikimediaCommonsCategory'>(props)}
        />
      )
    case 'IAPlaylist':
      return (
        <IAPlaylistEntries
          entries={collectionImport.entries}
          header={header}
          {...narrowFor<'IAPlaylist'>(props)}
        />
      )
  }
}
