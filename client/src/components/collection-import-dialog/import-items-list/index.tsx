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
  if (collectionImport.type === 'IACollection') {
    return (
      <IASearchList
        query={`collection:${collectionImport.id}`}
        emptyPlaceholder="No items in this collection"
        {...props}
      />
    )
  }
  if (collectionImport.type === 'IASearchCollection') {
    return <IASearchList query={collectionImport.query} {...props} />
  }
  if (collectionImport.type === 'OpenverseCollection') {
    return <OpenverseCollectionList collection={collectionImport} {...props} />
  }
  if (collectionImport.type === 'WikimediaCommonsCategory') {
    return <WikimediaCollectionList collection={collectionImport} {...props} />
  }
  return <IAPlaylistEntries entries={collectionImport.entries} {...props} />
}
