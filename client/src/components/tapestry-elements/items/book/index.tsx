import { memo } from 'react'
import { BookItemViewer } from 'tapestry-core-client/src/components/tapestry/items/book/viewer'
import { BookItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryItemProps } from '..'
import { useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { buildToolbarMenu, MoreSubmenu, TitleSubmenu } from '../../item-toolbar'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { TapestryItem } from '../tapestry-item'

export const BookItem = memo(({ id }: TapestryItemProps) => {
  const isEdit = useTapestryData('interactionMode') === 'edit'
  const dto = useTapestryData(`items.${id}.dto`) as BookItemDto

  const [editorControls, viewerControls] = buildToolbarMenu({ dto })

  const { toolbar } = useItemToolbar<TitleSubmenu | MoreSubmenu>(id, {
    items: isEdit ? editorControls : viewerControls,
  })

  return (
    <TapestryItem id={id} halo={toolbar}>
      <BookItemViewer id={id} isZipURL={dto.internallyHosted} />
    </TapestryItem>
  )
})
