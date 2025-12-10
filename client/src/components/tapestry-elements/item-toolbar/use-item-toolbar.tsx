import { ItemToolbar, ItemToolbarProps } from '.'
import { useSingleChoice } from 'tapestry-core-client/src/components/lib/hooks/use-single-choice'
import { omit } from 'lodash-es'
import { useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { SubmenuIds } from 'tapestry-core-client/src/components/lib/toolbar'

interface SubmenuControls<T extends ItemToolbarProps['items']> {
  selectedSubmenu: ReturnType<typeof useSingleChoice<SubmenuIds<T>>>[0]
  selectSubmenu: ReturnType<typeof useSingleChoice<SubmenuIds<T>>>[1]
  closeSubmenu: ReturnType<typeof useSingleChoice<SubmenuIds<T>>>[2]
}

export function useItemToolbar<const T extends ItemToolbarProps['items']>(
  tapestryItemId: string,
  props?: Omit<
    ItemToolbarProps,
    'selectedSubmenu' | 'onSelectSubmenu' | 'tapestryItemId' | 'items'
  > & {
    items?: T | ((submenuControls: SubmenuControls<T>) => T)
  },
) {
  const [selectedSubmenu, selectSubmenu, closeSubmenu] = useSingleChoice<SubmenuIds<T>>()
  const submenuControls = { selectedSubmenu, selectSubmenu, closeSubmenu }
  const interactiveElement = useTapestryData('interactiveElement')

  return {
    ...submenuControls,
    toolbar:
      tapestryItemId === interactiveElement?.modelId ? (
        <ItemToolbar
          tapestryItemId={tapestryItemId}
          selectedSubmenu={selectedSubmenu}
          onSelectSubmenu={(submenu: string | string[]) =>
            selectSubmenu(
              (typeof submenu === 'string' ? submenu : submenu.join('.')) as SubmenuIds<T>,
              true,
            )
          }
          {...omit(props, 'items')}
          items={typeof props?.items === 'function' ? props.items(submenuControls) : props?.items}
        />
      ) : null,
  }
}
