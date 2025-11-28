import { ImportItem } from '..'
import { IAImport } from '../../../pages/tapestry/view-model'
import { IACollectionList } from './collection-list'
import { IAPlaylistEntries } from './playlist'
import { ReactNode } from 'react'

export interface ImportItemsListProps {
  onSelect: (item: ImportItem) => unknown
  onToggleAll: (checked: boolean) => unknown
  toggling: boolean
  iaImport: IAImport
  selectedItems: ImportItem[]
  header?: ReactNode
}

export function ImportItemsList({ iaImport, ...props }: ImportItemsListProps) {
  if (iaImport.type === 'IACollection') {
    return <IACollectionList collectionId={iaImport.id} {...props} />
  }
  return <IAPlaylistEntries entries={iaImport.entries} {...props} />
}
