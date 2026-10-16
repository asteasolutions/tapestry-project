import { memo } from 'react'
import { IiifItemViewer } from 'tapestry-core-client/src/components/tapestry/items/iiif/viewer'
import { IiifItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryItemProps } from '..'
import { useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { buildToolbarMenu } from '../../item-toolbar'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { TapestryItem } from '../tapestry-item'

export const IiifItem = memo(({ id }: TapestryItemProps) => {
  const isEdit = useTapestryData('interactionMode') === 'edit'
  const dto = useTapestryData(`items.${id}.dto`) as IiifItemDto

  const { toolbar } = useItemToolbar(id, { items: buildToolbarMenu({ dto, isEdit }) })

  return (
    <TapestryItem id={id} halo={toolbar}>
      <IiifItemViewer id={id} />
    </TapestryItem>
  )
})
