import { memo } from 'react'
import { TapestryElementComponentProps } from '../..'
import { TapestryItem } from '../tapestry-item'
import { ActionButtonItemViewer } from './viewer'

export const ActionButtonItem = memo(({ id }: TapestryElementComponentProps) => {
  return (
    <TapestryItem id={id} halo={null}>
      <ActionButtonItemViewer id={id} />
    </TapestryItem>
  )
})
