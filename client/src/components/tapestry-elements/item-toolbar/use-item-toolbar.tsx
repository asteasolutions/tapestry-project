import { ItemToolbar, ItemToolbarMenu, ItemToolbarProps, MoreSubmenu, TitleSubmenu } from '.'
import { useSingleChoice } from 'tapestry-core-client/src/components/lib/hooks/use-single-choice'
import { omit } from 'lodash'
import { useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { ShareSubmenu } from './share-menu'

interface SubmenuControls<Choice extends string> {
  selectedSubmenu: ReturnType<typeof useSingleChoice<Choice>>[0]
  selectSubmenu: ReturnType<typeof useSingleChoice<Choice>>[1]
  closeSubmenu: ReturnType<typeof useSingleChoice<Choice>>[2]
}

export function useItemToolbar<Submenus extends string = TitleSubmenu | MoreSubmenu | ShareSubmenu>(
  tapestryItemId: string,
  props?: Omit<
    ItemToolbarProps,
    'selectedSubmenu' | 'onSelectSubmenu' | 'tapestryItemId' | 'items'
  > & {
    items?: ItemToolbarMenu | ((submenuControls: SubmenuControls<Submenus>) => ItemToolbarMenu)
  },
  hide?: boolean,
) {
  const [selectedSubmenu, selectSubmenu, closeSubmenu] = useSingleChoice<Submenus>()
  const submenuControls = { selectedSubmenu, selectSubmenu, closeSubmenu }
  const interactiveElement = useTapestryData('interactiveElement')

  return {
    ...submenuControls,
    toolbar:
      !hide && tapestryItemId === interactiveElement?.modelId ? (
        <ItemToolbar
          tapestryItemId={tapestryItemId}
          selectedSubmenu={selectedSubmenu}
          onSelectSubmenu={(submenu) =>
            selectSubmenu(
              (typeof submenu === 'string' ? submenu : submenu.join('.')) as Submenus,
              true,
            )
          }
          {...omit(props, 'items')}
          items={typeof props?.items === 'function' ? props.items(submenuControls) : props?.items}
        />
      ) : null,
  }
}
