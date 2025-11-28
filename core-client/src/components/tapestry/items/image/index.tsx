import { TapestryItem } from '../tapestry-item'
import { memo } from 'react'
import { TapestryElementComponentProps } from '../..'
import { ItemToolbar } from '../item-toolbar'
import { ImageItemViewer } from './viewer'

export const ImageItem = memo(({ id }: TapestryElementComponentProps) => {
  return (
    <TapestryItem id={id} halo={<ItemToolbar tapestryItemId={id} />}>
      <ImageItemViewer id={id} />
    </TapestryItem>
  )
})
