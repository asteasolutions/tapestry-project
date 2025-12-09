import { memo } from 'react'
import { ImageItemViewer } from 'tapestry-core-client/src/components/tapestry/items/image/viewer'
import { ImageItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryItemProps } from '..'
import { useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { buildToolbarMenu, MoreSubmenu, TitleSubmenu } from '../../item-toolbar'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { TapestryItem } from '../tapestry-item'

export const ImageItem = memo(({ id }: TapestryItemProps) => {
  const isEdit = useTapestryData('interactionMode') === 'edit'
  const dto = useTapestryData(`items.${id}.dto`) as ImageItemDto

  const [editorControls, viewerControls] = buildToolbarMenu({ dto })

  const { toolbar } = useItemToolbar<TitleSubmenu | MoreSubmenu>(id, {
    items: isEdit ? editorControls : viewerControls,
  })

  return (
    <TapestryItem id={id} halo={toolbar}>
      <ImageItemViewer id={id} />
    </TapestryItem>
  )
})
