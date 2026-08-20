import { ImportItem } from '..'
import { IAImport } from '../../../pages/tapestry/view-model'
import { IAPlaylistEntries } from './playlist'
import { IASearchList } from './search-list'
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
    return (
      <IASearchList
        query={`collection:${iaImport.id}`}
        emptyPlaceholder="No items in this collection"
        {...props}
      />
    )
  }
  if (iaImport.type === 'IASearchCollection') {
    return <IASearchList query={iaImport.query} {...props} />
  }
  return <IAPlaylistEntries entries={iaImport.entries} {...props} />
}
