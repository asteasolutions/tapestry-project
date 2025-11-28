import { MaybeMenuItem } from '../../../lib/toolbar/index'
import { Rectangle } from 'tapestry-core/src/lib/geometry'
import { useItemMenu } from '../../hooks/use-item-menu'
import { ElementToolbar, ElementToolbarProps } from '../../element-toolbar'
import { useTapestryConfig } from '../..'
import { ACTIVE_ITEM_BORDER_WIDTH } from '../tapestry-item'

export type ItemToolbarProps = Omit<ElementToolbarProps, 'isOpen' | 'items' | 'elementBounds'> & {
  items?: MaybeMenuItem[]
  tapestryItemId: string
}

export function ItemToolbar({ items = [], tapestryItemId: id, ...props }: ItemToolbarProps) {
  const { useStoreData } = useTapestryConfig()
  const dto = useStoreData(`items.${id}.dto`)!

  const menu = useItemMenu(id, [
    ...items,
    items.length > 0 && 'separator',
    'focus',
    'separator',
    'info',
    'separator',
    'prev',
    'next',
  ])

  return (
    <>
      <ElementToolbar
        isOpen
        items={menu.items}
        style={{ cursor: 'auto' }}
        elementBounds={new Rectangle(dto).expand(ACTIVE_ITEM_BORDER_WIDTH)}
        {...props}
      />
      {menu.ui}
    </>
  )
}
