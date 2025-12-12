import { ItemToolbar, ItemToolbarMenu, ItemToolbarProps } from '.'
import { useSingleChoice } from 'tapestry-core-client/src/components/lib/hooks/use-single-choice'
import { omit } from 'lodash-es'
import { useTapestryData } from '../../../pages/tapestry/tapestry-providers'

interface SubmenuControls {
  selectedSubmenu: ReturnType<typeof useSingleChoice<string>>[0]
  selectSubmenu: ReturnType<typeof useSingleChoice<string>>[1]
  closeSubmenu: ReturnType<typeof useSingleChoice<string>>[2]
}

export function useItemToolbar(
  tapestryItemId: string,
  props?: Omit<
    ItemToolbarProps,
    'selectedSubmenu' | 'onSelectSubmenu' | 'tapestryItemId' | 'items'
  > & {
    items?: ItemToolbarMenu | ((submenuControls: SubmenuControls) => ItemToolbarMenu)
  },
  hide?: boolean,
) {
  const [selectedSubmenu, selectSubmenu, closeSubmenu] = useSingleChoice<string>()
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
            selectSubmenu(typeof submenu === 'string' ? submenu : submenu.join('.'), true)
          }
          {...omit(props, 'items')}
          items={typeof props?.items === 'function' ? props.items(submenuControls) : props?.items}
        />
      ) : null,
  }
}
