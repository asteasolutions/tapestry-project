import { TapestryItemProps } from '..'
import { TapestryItem } from '../tapestry-item'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { memo } from 'react'
import { ImageItemViewer } from 'tapestry-core-client/src/components/tapestry/items/image/viewer'

export const ImageItem = memo(({ id }: TapestryItemProps) => {
  const { toolbar } = useItemToolbar(id)

  return (
    <TapestryItem id={id} halo={toolbar}>
      <ImageItemViewer id={id} />
    </TapestryItem>
  )
})
