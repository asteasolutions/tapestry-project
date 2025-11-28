import { TapestryItem } from '../tapestry-item'
import { memo } from 'react'
import { VideoItemPlayer } from './player'
import { TapestryElementComponentProps } from '../..'
import { ItemToolbar } from '../item-toolbar'

export const VideoItem = memo(({ id }: TapestryElementComponentProps) => {
  return (
    <TapestryItem id={id} halo={<ItemToolbar tapestryItemId={id} />}>
      <VideoItemPlayer id={id} />
    </TapestryItem>
  )
})
