import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { parseWebSource } from 'tapestry-core/src/web-sources'
import { MenuItemToggle } from 'tapestry-core-client/src/components/lib/buttons/menu-item-toggle'
import { ReactNode, useState } from 'react'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { TimeInput } from '../../../time-input'
import { MenuItemWithSubmenu } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { IconButton, MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useDispatch } from '../../../../pages/tapestry/tapestry-providers'
import { setSnackbar } from '../../../../pages/tapestry/view-model/store-commands/tapestry'
import { compact } from 'lodash'
import { useCreateShareUrl } from '../../../../hooks/use-create-share-url'
import { PdfPageSelector } from 'tapestry-core-client/src/components/tapestry/items/pdf/page-selector'
import { Text } from 'tapestry-core-client/src/components/lib/text'

const SHARE_SUBMENU_ID = 'share_menu'
export type ShareSubmenu = typeof SHARE_SUBMENU_ID

interface ShareMenuProps {
  selectSubmenu: (id: ShareSubmenu) => unknown
  selectedSubmenu: string
  menu: ReactNode
}

export function shareMenu({
  selectSubmenu,
  selectedSubmenu,
  menu,
}: ShareMenuProps): MenuItemWithSubmenu {
  return {
    id: SHARE_SUBMENU_ID,
    ui: {
      element: (
        <IconButton
          icon="share"
          aria-label="Get link"
          onClick={() => selectSubmenu(SHARE_SUBMENU_ID)}
          isActive={selectedSubmenu === SHARE_SUBMENU_ID}
        />
      ),
    },
    direction: 'column',
    submenu: menu,
  }
}

interface PlayableShareMenuProps {
  item: ItemDto
}

export function PlayableShareMenu({ item }: PlayableShareMenuProps) {
  const [startTime, setStartTime] = useState<number | null>(null)
  const [stopTime, setStopTime] = useState<number | null>(null)
  const [autoplay, setAutoplay] = useState(false)

  const webpageType = item.type === 'webpage' ? parseWebSource(item).webpageType : null
  const playableType = item.type === 'audio' || webpageType === 'iaAudio' ? 'Audio' : 'Video'
  const canSetEndTime =
    webpageType === 'vimeo' ||
    webpageType === 'youtube' ||
    item.type === 'video' ||
    item.type === 'audio'

  return compact([
    <TimeInput
      onChange={setStartTime}
      text={`${playableType} start at`}
      value={startTime}
      key="start-time"
    />,
    canSetEndTime && (
      <TimeInput
        onChange={setStopTime}
        text={`${playableType} stop at`}
        value={stopTime}
        min={startTime ?? 0}
        key="end-time"
      />
    ),
    <MenuItemToggle isChecked={autoplay} onClick={() => setAutoplay(!autoplay)} key="autoplay">
      <Icon icon="autoplay" /> Autoplay
    </MenuItemToggle>,
    <div className="separator" key="separator" />,
    <CopyLinkMenuButton
      params={() =>
        new URLSearchParams({
          focus: item.id,
          autoplay: `${autoplay}`,
          ...(startTime ? { startTime: `${startTime}` } : {}),
          ...(stopTime ? { stopTime: `${stopTime}` } : {}),
        })
      }
      key="copy-link"
    />,
  ])
}

interface PdfShareMenuProps {
  item: ItemDto
  totalPages: number
  currentPage: number
}

export function PdfShareMenu({ item, totalPages, currentPage }: PdfShareMenuProps) {
  const [page, setPage] = useState(currentPage)
  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Text variant="bodySm" style={{ marginLeft: '8px' }}>
          Page
        </Text>
        <PdfPageSelector onChange={setPage} page={page} showTotal={false} total={totalPages} />
      </div>
      <div className="separator" key="separator" />
      <CopyLinkMenuButton params={() => new URLSearchParams({ focus: item.id, page: `${page}` })} />
    </>
  )
}

function CopyLinkMenuButton({ params }: { params: () => URLSearchParams }) {
  const dispatch = useDispatch()
  const createShareUrl = useCreateShareUrl()

  const copyLink = async () => {
    const url = createShareUrl(params)
    await navigator.clipboard.writeText(url)
    dispatch(setSnackbar('Link copied!'))
  }
  return (
    <MenuItemButton style={{ color: 'var(--theme-text-link)' }} onClick={copyLink}>
      <Icon icon="share" /> Get link to item
    </MenuItemButton>
  )
}
