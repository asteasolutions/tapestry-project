import { memo } from 'react'
import { TapestryElementComponentProps } from '../..'
import { TapestryItem } from '../tapestry-item'
import styles from './styles.module.css'
import { ActionButtonItemViewer } from './viewer'

export const ActionButtonItem = memo(({ id }: TapestryElementComponentProps) => {
  return (
    <TapestryItem id={id} halo={null} classes={{ root: styles.item }}>
      <ActionButtonItemViewer id={id} clickable />
    </TapestryItem>
  )
})
