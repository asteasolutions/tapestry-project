import { ReactNode, RefObject } from 'react'
import { CreateItemsFromSelection } from '..'
import { CollectionImport } from '../../../pages/tapestry/view-model'
import { OpenverseCollectionList } from './openverse-collection-list'
import { WikimediaCollectionList } from './wikimedia-collection-list'
import { IAPlaylistEntries } from './ia-playlist'
import { IASearchList } from './ia-search-list'

export interface ImportItemsListProps {
  selectedIndices: Set<number>
  selectItems: (indices: number[]) => void
  deselectItem: (index: number) => void
  deselectAllItems: () => void
  createItemsFromSelectionRef: RefObject<CreateItemsFromSelection | undefined>
  tapestryId: string
  collectionImport: CollectionImport
  header?: ReactNode
}

export function ImportItemsList({ collectionImport, header, ...props }: ImportItemsListProps) {
  switch (collectionImport.type) {
    case 'IACollection':
      return (
        <IASearchList
          query={`collection:${collectionImport.id}`}
          emptyPlaceholder="No items in this collection"
          header={header}
          {...props}
        />
      )
    case 'IASearchCollection':
      return <IASearchList query={collectionImport.query} header={header} {...props} />
    case 'OpenverseCollection':
      return <OpenverseCollectionList collection={collectionImport} header={header} {...props} />
    case 'WikimediaCommonsCategory':
      return <WikimediaCollectionList collection={collectionImport} header={header} {...props} />
    case 'IAPlaylist':
      return <IAPlaylistEntries collectionImport={collectionImport} header={header} {...props} />
  }
}
