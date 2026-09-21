import { ImportItem } from '..'
import { CollectionImport } from '../../../pages/tapestry/view-model'
import { OpenverseCollectionList } from './openverse-collection-list'
import { WikimediaCollectionList } from './wikimedia-collection-list'
import { IAPlaylistEntries } from './ia-playlist'
import { IASearchList } from './ia-search-list'
import { ReactNode } from 'react'

export interface ImportItemsListProps {
  onSelect: (item: ImportItem) => unknown
  onSelectAll: (items: ImportItem[]) => unknown
  onDeselectAll: () => unknown
  collectionImport: CollectionImport
  selectedItems: ImportItem[]
  header?: ReactNode
}

export function ImportItemsList({ collectionImport, ...props }: ImportItemsListProps) {
  switch (collectionImport.type) {
    case 'IACollection':
      return (
        <IASearchList
          query={`collection:${collectionImport.id}`}
          emptyPlaceholder="No items in this collection"
          {...props}
        />
      )
    case 'IASearchCollection':
      return <IASearchList query={collectionImport.query} {...props} />
    case 'OpenverseCollection':
      return <OpenverseCollectionList collection={collectionImport} {...props} />
    case 'WikimediaCommonsCategory':
      return <WikimediaCollectionList collection={collectionImport} {...props} />
    case 'IAPlaylist':
      return <IAPlaylistEntries entries={collectionImport.entries} {...props} />
  }
}
