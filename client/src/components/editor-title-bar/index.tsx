import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Button,
  IconButton,
  MenuItemButton,
} from 'tapestry-core-client/src/components/lib/buttons/index'
import { useSingleChoice } from 'tapestry-core-client/src/components/lib/hooks/use-single-choice'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import { SubmenuIds } from 'tapestry-core-client/src/components/lib/toolbar'
import { MenuItems, Toolbar } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { useFocusRectInset } from 'tapestry-core-client/src/components/tapestry/hooks/use-focus-rect-inset'
import { isMobile } from 'tapestry-core-client/src/lib/user-agent'
import Logo from '../../assets/icons/logo.svg?react'
import { useTapestryBookmark } from '../../hooks/use-tapestry-bookmark'
import { useSession } from '../../layouts/session'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import {
  setIsConfiguringPresentationOrder,
  setSnackbar,
  setViewAsStart,
  updateTapestry,
} from '../../pages/tapestry/view-model/store-commands/tapestry'
import { focusItems } from '../../pages/tapestry/view-model/store-commands/viewport'
import { dashboardPath } from '../../utils/paths'
import { CreateTapestryDialog } from '../create-tapestry-dialog'
import { DeleteTapestryModal } from '../delete-tapestry-modal'
import { EditTapestryDialog } from '../edit-tapestry-dialog'
import { ForkTapestryDialog } from '../fork-tapestry-dialog'
import { ExportButton } from './export-button'
import { PasteButton } from './paste-button'
import styles from './styles.module.css'

export function EditorTitleBar() {
  const {
    title,
    slug,
    id: tapestryId,
    ownerId,
    description,
    presentationOrderState,
    hideEditControls,
  } = useTapestryData([
    'id',
    'slug',
    'title',
    'ownerId',
    'description',
    'presentationOrderState',
    'hideEditControls',
  ])
  const dispatch = useDispatch()
  const [selectedSubmenu, selectSubmenu, closeSubmenu] = useSingleChoice<SubmenuIds<typeof items>>()
  // TODO: Implement a hook, which provides the controls and JSX for the modals
  const [deletingTapestry, setDeletingTapestry] = useState(false)
  const [creatingTapestry, setCreatingTapestry] = useState(false)
  const [forkingTapestry, setForkingTapestry] = useState(false)
  const [editingTapestry, setEditingTapestry] = useState(false)

  const { user } = useSession()

  const isOwner = user?.id === ownerId

  const {
    isBookmarked,
    loading: loadingBookmark,
    toggleBookmark,
  } = useTapestryBookmark({ tapestryId, userId: user?.id })

  const navigate = useNavigate()

  useFocusRectInset({ top: 64 })

  const items = [
    {
      element: (
        <Link to={dashboardPath('home')} className={styles.link}>
          <SvgIcon Icon={Logo} size={28} className={styles.logo} />
        </Link>
      ),
      tooltip: { side: 'bottom', children: 'Go to tapestries', offset: -8 },
      stretch: true,
    },
    !hideEditControls && {
      id: 'more',
      ui: {
        element: (
          <IconButton
            icon="more_vert"
            aria-label="More actions"
            onClick={() => selectSubmenu('more', true)}
            isActive={selectedSubmenu.startsWith('more')}
            style={{ marginLeft: '8px' }}
          />
        ),
        tooltip: { side: 'bottom', children: 'Tapestry options' },
      },
      direction: 'column',
      submenu: [
        <MenuItemButton
          icon="add"
          onClick={() => {
            setCreatingTapestry(true)
            closeSubmenu()
          }}
        >
          Create new
        </MenuItemButton>,
        <MenuItemButton
          icon="content_copy"
          onClick={() => {
            closeSubmenu()
            setForkingTapestry(true)
          }}
        >
          Make a copy
        </MenuItemButton>,
        <ExportButton
          tapestryId={tapestryId}
          onError={() => dispatch(setSnackbar({ text: 'Error during export', variant: 'error' }))}
          onSuccess={closeSubmenu}
        />,
        isOwner && (
          <MenuItemButton
            icon="edit_note"
            onClick={() => {
              setEditingTapestry(true)
              closeSubmenu()
            }}
          >
            Edit title and description
          </MenuItemButton>
        ),
        isMobile && <PasteButton tapestryId={tapestryId} onPaste={closeSubmenu} />,
        'separator',
        <MenuItemButton
          icon="picture_in_picture_center"
          onClick={() => {
            dispatch(setViewAsStart(), setSnackbar('Start view has been set'))
            closeSubmenu()
          }}
        >
          Set current view as start
        </MenuItemButton>,
        'separator',
        <MenuItemButton
          icon="animated_images"
          onClick={() => {
            dispatch(
              setIsConfiguringPresentationOrder(true),
              focusItems(),
              setSnackbar('You are in Presentation configuration mode'),
            )
            closeSubmenu()
          }}
        >
          Configure presentation order
        </MenuItemButton>,
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
        isOwner && 'separator',
        isOwner && (
          <MenuItemButton
            icon="delete"
            variant="negative"
            onClick={() => {
              setDeletingTapestry(true)
              closeSubmenu()
            }}
          >
            Delete
          </MenuItemButton>
        ),
      ],
    },
  ] as const satisfies MenuItems

  return (
    <div className={styles.root}>
      <Toolbar isOpen selectedSubmenu={selectedSubmenu} onFocusOut={closeSubmenu} items={items} />
      <div id="titlebar-action-buttons">
        {!!presentationOrderState && (
          <Button
            aria-label="Done"
            onClick={() => dispatch(setIsConfiguringPresentationOrder(false))}
            className="titlebar-action-done"
          >
            Done <Icon icon="check_circle" />
          </Button>
        )}
      </div>
      {deletingTapestry && (
        <DeleteTapestryModal
          id={tapestryId}
          title={title}
          onCancel={() => setDeletingTapestry(false)}
          onConfirm={() => navigate(dashboardPath('home'), { replace: true })}
        />
      )}
      {forkingTapestry && (
        <ForkTapestryDialog
          onClose={() => setForkingTapestry(false)}
          tapestryId={tapestryId}
          tapestryInfo={{ title, description: description ?? undefined }}
        />
      )}
      {creatingTapestry && <CreateTapestryDialog onCancel={() => setCreatingTapestry(false)} />}
      {editingTapestry && (
        <EditTapestryDialog
          onCancel={() => setEditingTapestry(false)}
          handleSubmit={({ title, slug, description }) => {
            dispatch(updateTapestry({ title, slug, description }))
            setEditingTapestry(false)
            return Promise.resolve()
          }}
          tapestryInfo={{
            title,
            slug,
            description: description ?? undefined,
          }}
        />
      )}
    </div>
  )
}
