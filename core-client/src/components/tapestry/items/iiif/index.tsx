import { TapestryItem } from '../tapestry-item'
import { memo } from 'react'
import { TapestryElementComponentProps } from '../..'
import { ItemToolbar } from '../item-toolbar'
import { IiifItemViewer } from './viewer'

export const IiifItem = memo(({ id }: TapestryElementComponentProps) => {
  return (
    <TapestryItem id={id} halo={<ItemToolbar tapestryItemId={id} />}>
      <IiifItemViewer id={id} />
    </TapestryItem>
  )
})
