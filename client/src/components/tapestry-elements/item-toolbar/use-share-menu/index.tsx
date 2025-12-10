import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { parseWebSource } from 'tapestry-core/src/web-sources'
import { MenuItemToggle } from 'tapestry-core-client/src/components/lib/buttons/menu-item-toggle'
import { useState } from 'react'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { TimeInput } from '../../../time-input'
import { MenuItem } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { IconButton, MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useDispatch } from '../../../../pages/tapestry/tapestry-providers'
import { setSnackbar } from '../../../../pages/tapestry/view-model/store-commands/tapestry'
import { compact } from 'lodash-es'
import { CopyLinkButton } from '../../copy-link-button'
import { useCreateShareUrl } from '../../../../hooks/use-create-share-url'
import { ItemType, WebpageType } from 'tapestry-core/src/data-format/schemas/item'

const SHARE_MENU_ID = 'share-menu'

const PLAYABLE_WEBPAGE_TYPES: WebpageType[] = ['iaAudio', 'iaVideo', 'vimeo', 'youtube']
const PLAYBLE_ITEM_TYPES: ItemType[] = ['audio', 'video']

export function useShareMenu(item: ItemDto, selectSubmenu: (id: string) => unknown): MenuItem {
  const [autoplay, setAutoplay] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [stopTime, setStopTime] = useState<number | null>(null)

  const createShareUrl = useCreateShareUrl(item.id)
  const dispatch = useDispatch()
  const copyLink = async () => {
    const url = createShareUrl({ startTime, stopTime, autoplay })
    await navigator.clipboard.writeText(url)
    dispatch(setSnackbar('Link copied!'))
  }

  const webpageType = item.type === 'webpage' ? parseWebSource(item).webpageType : null
  const isPlayableItem =
    (!!webpageType && PLAYABLE_WEBPAGE_TYPES.includes(webpageType)) ||
    PLAYBLE_ITEM_TYPES.includes(item.type)

  if (!isPlayableItem) {
    return {
      element: <CopyLinkButton id={item.id} />,
      tooltip: { side: 'bottom', children: 'Get link' },
    }
  }

  const playableType = item.type === 'audio' || webpageType === 'iaAudio' ? 'Audio' : 'Video'

  return {
    id: SHARE_MENU_ID,
    ui: {
      element: (
        <IconButton
          icon="share"
          aria-label="Get link"
          onClick={() => selectSubmenu(SHARE_MENU_ID)}
        />
      ),
    },
    direction: 'column',
    submenu: compact([
      <TimeInput onChange={setStartTime} text={`${playableType} start at`} value={startTime} />,
      (webpageType === 'vimeo' ||
        webpageType === 'youtube' ||
        item.type === 'video' ||
        item.type === 'audio') && (
        <TimeInput
          onChange={setStopTime}
          text={`${playableType} stop at`}
          value={stopTime}
          min={startTime ?? 0}
        />
      ),
      <MenuItemToggle isChecked={autoplay} onClick={() => setAutoplay(!autoplay)}>
        <Icon icon="autoplay" /> Autoplay
      </MenuItemToggle>,
      'separator',
      <MenuItemButton style={{ color: 'var(--theme-text-link)' }} onClick={copyLink}>
        <Icon icon="share" /> Get link to item
      </MenuItemButton>,
    ]),
  }
}
