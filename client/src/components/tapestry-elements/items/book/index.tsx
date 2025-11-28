import { memo } from 'react'
import { BookItemViewer } from 'tapestry-core-client/src/components/tapestry/items/book/viewer'
import { TapestryItemProps } from '..'
import { useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { TapestryItem } from '../tapestry-item'

export const BookItem = memo(({ id }: TapestryItemProps) => {
  const { toolbar } = useItemToolbar(id)

  const internallyHosted = useTapestryData(`items.${id}.dto.internallyHosted`) as
    | boolean
    | undefined

  return (
    <TapestryItem id={id} halo={toolbar}>
      <BookItemViewer id={id} isZipURL={internallyHosted} />
    </TapestryItem>
  )
})
