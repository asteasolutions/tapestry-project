import { memo } from 'react'
import { TapestryElementComponentProps } from '../..'
import { ItemToolbar } from '../item-toolbar'
import { TapestryItem } from '../tapestry-item'
import { WebpageItemViewer } from './viewer'

export const WebpageItem = memo(({ id }: TapestryElementComponentProps) => {
  return (
    <TapestryItem id={id} halo={<ItemToolbar tapestryItemId={id} />}>
      <WebpageItemViewer id={id} />
    </TapestryItem>
  )
})
