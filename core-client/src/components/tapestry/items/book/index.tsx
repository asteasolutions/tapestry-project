import { memo } from 'react'
import { TapestryElementComponentProps } from '../..'
import { ItemToolbar } from '../item-toolbar'
import { TapestryItem } from '../tapestry-item'
import { BookItemViewer } from './viewer'

export const BookItem = memo(({ id }: TapestryElementComponentProps) => {
  return (
    <TapestryItem id={id} halo={<ItemToolbar tapestryItemId={id} />}>
      <BookItemViewer id={id} />
    </TapestryItem>
  )
})
