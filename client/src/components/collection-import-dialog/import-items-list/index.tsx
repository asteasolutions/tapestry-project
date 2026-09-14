import { ImportItem } from '..'
import { CollectionImport } from '../../../pages/tapestry/view-model'
import { ExternalCollectionList } from './external-collection-list'
import { IAPlaylistEntries } from './playlist'
import { IASearchList } from './search-list'
import { ReactNode } from 'react'

export interface ImportItemsListProps {
  onSelect: (item: ImportItem) => unknown
  onToggleAll: (checked: boolean) => unknown
  toggling: boolean
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
  if (
    collectionImport.type === 'OpenverseCollection' ||
    collectionImport.type === 'WikimediaCommonsCategory'
  ) {
    return <ExternalCollectionList collection={collectionImport} {...props} />
  }
  return <IAPlaylistEntries entries={collectionImport.entries} {...props} />
}
