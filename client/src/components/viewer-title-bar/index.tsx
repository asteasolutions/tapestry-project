import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router'
import { PropsWithStyle } from 'tapestry-core-client/src/components/lib'
import { IconButton, MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useSingleChoice } from 'tapestry-core-client/src/components/lib/hooks/use-single-choice'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import { SubmenuIds } from 'tapestry-core-client/src/components/lib/toolbar'
import { MenuItems, Toolbar } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { useFocusRectInset } from 'tapestry-core-client/src/components/tapestry/hooks/use-focus-rect-inset'
import { TapestryInfoDialog } from 'tapestry-core-client/src/components/tapestry/tapestry-info-dialog'
import Logo from '../../assets/icons/logo.svg?react'
import { useTapestryBookmark } from '../../hooks/use-tapestry-bookmark'
import { useSession } from '../../layouts/session'
import { fullName } from '../../model/data/utils'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { setSnackbar } from '../../pages/tapestry/view-model/store-commands/tapestry'
import { dashboardPath } from '../../utils/paths'
import { ExportButton } from '../editor-title-bar/export-button'
import { ForkTapestryDialog } from '../fork-tapestry-dialog'
import { JoinTapestriesModal } from '../join-tapestries-modal'
import styles from './styles.module.css'

export function ViewerTitleBar({ className, style }: PropsWithStyle) {
  const { id, title, description, thumbnail, userAccess, allowForking, createdAt, owner } =
    useTapestryData([
      'id',
      'title',
      'description',
      'thumbnail',
      'userAccess',
      'allowForking',
      'createdAt',
      'owner',
    ])
  const { user } = useSession()
  const [joinPopup, setJoinPopup] = useState(false)
  const [forkingTapestry, setForkingTapestry] = useState(false)
  const [viewingInfo, setViewingInfo] = useState(false)
  const dispatch = useDispatch()

  const canForkTapestry = userAccess === 'edit' || allowForking

  useFocusRectInset({ top: 64 })

  const {
    isBookmarked,
    loading: loadingBookmark,
    toggleBookmark,
  } = useTapestryBookmark({ tapestryId: id, userId: user?.id })

  const [selectedSubmenu, selectSubmenu, closeSubmenu] = useSingleChoice<SubmenuIds<typeof items>>()

  const items = [
    {
      element: (
        <Link to={dashboardPath('home')} className={styles.link}>
          <SvgIcon Icon={Logo} size={28} className={styles.logo} />
        </Link>
      ),
      tooltip: { side: 'bottom', children: 'Go to tapestries', offset: -8 },
    },
    {
      id: 'more',
      ui: {
        element: (
          <IconButton
            icon="more_vert"
            aria-label="More actions"
            onClick={() => selectSubmenu('more', true)}
            isActive={selectedSubmenu.startsWith('more')}
          />
        ),
        tooltip: { side: 'bottom', children: 'Tapestry options' },
      },
      direction: 'column',
      submenu: [
        <MenuItemButton
          icon="info"
          onClick={() => {
            closeSubmenu()

            setViewingInfo(true)
          }}
        >
          View tapestry info
        </MenuItemButton>,
        <MenuItemButton
          icon="content_copy"
          disabled={!canForkTapestry}
          tooltip={
            canForkTapestry
              ? undefined
              : { children: "You don't have forking permissions", side: 'bottom', offset: 16 }
          }
          onClick={() => {
            closeSubmenu()
            if (!user) {
              setJoinPopup(true)
            } else {
              setForkingTapestry(true)
            }
          }}
        >
          Make a copy
        </MenuItemButton>,
        <ExportButton
          disabled={!canForkTapestry}
          tooltip={
            canForkTapestry
              ? undefined
              : { children: "You don't have export permissions", side: 'bottom' }
          }
          tapestryId={id}
          onError={() => dispatch(setSnackbar({ text: 'Error during export', variant: 'error' }))}
          onSuccess={closeSubmenu}
        />,
        ...(user
          ? ([
              'separator',
              <MenuItemButton
                icon="bookmark"
                disabled={loadingBookmark}
                onClick={async () => {
                  await toggleBookmark()
                  dispatch(
                    setSnackbar(
                      isBookmarked
                        ? 'Tapestry removed from "Bookmakrs"'
                        : 'Tapestry added to "Bookmarks"',
                    ),
                  )
                }}
              >
                {isBookmarked ? 'Remove from "Bookmarks"' : 'Add to "Bookmarks"'}
              </MenuItemButton>,
            ] as const)
          : []),
      ],
    },
  ] as const satisfies MenuItems

  return (
    <div className={clsx(styles.root, className)} style={style}>
      <Toolbar isOpen selectedSubmenu={selectedSubmenu} onFocusOut={closeSubmenu} items={items} />
      <div id="titlebar-action-buttons" />
      {joinPopup && <JoinTapestriesModal onClose={() => setJoinPopup(false)} />}
      {forkingTapestry && (
        <ForkTapestryDialog
          onClose={() => setForkingTapestry(false)}
          tapestryId={id}
          tapestryInfo={{
            title,
            description: description ?? '',
          }}
        />
      )}
      {viewingInfo && (
        <TapestryInfoDialog
          tapestry={{ title, description, thumbnail, createdAt }}
          owner={fullName(owner)}
          onClose={() => setViewingInfo(false)}
        />
      )}
    </div>
  )
}
