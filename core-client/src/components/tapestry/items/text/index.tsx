import { memo } from 'react'
import { TapestryElementComponentProps } from '../..'
import { ItemToolbar } from '../item-toolbar'
import { TapestryItem } from '../tapestry-item'
import { TextItemViewer } from './viewer'

export const TextItem = memo(({ id }: TapestryElementComponentProps) => {
  return (
    <TapestryItem id={id} halo={<ItemToolbar tapestryItemId={id} />}>
      <TextItemViewer id={id} />
    </TapestryItem>
  )
})
