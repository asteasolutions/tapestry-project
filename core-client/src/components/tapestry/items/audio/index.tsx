import { TapestryItem } from '../tapestry-item'
import { memo } from 'react'
import { TapestryElementComponentProps } from '../..'
import { AudioItemPlayer } from './player'
import { ItemToolbar } from '../item-toolbar'

export const AudioItem = memo(({ id }: TapestryElementComponentProps) => {
  return (
    <TapestryItem id={id} halo={<ItemToolbar tapestryItemId={id} />}>
      <AudioItemPlayer id={id} />
    </TapestryItem>
  )
})
