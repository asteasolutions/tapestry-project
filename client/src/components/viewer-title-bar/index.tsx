import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router'
import { PropsWithStyle } from 'tapestry-core-client/src/components/lib'
import { Button, IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import { MenuItems, Toolbar } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { useViewportObstruction } from 'tapestry-core-client/src/components/tapestry/hooks/use-viewport-obstruction'
import { TapestryInfoDialog } from 'tapestry-core-client/src/components/tapestry/tapestry-info-dialog'
import Logo from 'tapestry-core-client/src/assets/icons/logo.svg?react'
import { useTapestryBookmark } from '../../hooks/use-tapestry-bookmark'
import { useSession } from '../../layouts/session'
import { fullName } from '../../model/data/utils'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { setSnackbar } from '../../pages/tapestry/view-model/store-commands/tapestry'
import { dashboardPath } from '../../utils/paths'
import { ForkTapestryDialog } from '../fork-tapestry-dialog'
import { JoinTapestriesModal } from '../join-tapestries-modal'
import styles from './styles.module.css'
import { Avatar } from '../avatar'
import { useTapestryExport } from '../../hooks/use-tapestry-export'
import { ExportProgressIndicator } from '../editor-title-bar/export-progress-indicator'

export function ViewerTitleBar({ className, style }: PropsWithStyle) {
  const obstruction = useViewportObstruction({ clear: { top: true, left: true } })
  const {
    id,
    title,
    description,
    thumbnail,
    userAccess,
    allowForking,
    createdAt,
    updatedAt,
    owner,
  } = useTapestryData([
    'id',
    'title',
    'description',
    'thumbnail',
    'userAccess',
    'allowForking',
    'createdAt',
    'updatedAt',
    'owner',
  ])
  const { progress, triggerExport } = useTapestryExport({
    tapestryId: id,
    onError: () => dispatch(setSnackbar({ text: 'Error during export', variant: 'error' })),
    onSuccess: () => setViewingInfo(false),
  })
  const { user } = useSession()
  const [joinPopup, setJoinPopup] = useState(false)
  const [forkingTapestry, setForkingTapestry] = useState(false)
  const [viewingInfo, setViewingInfo] = useState(false)
  const dispatch = useDispatch()

  const canForkTapestry = userAccess === 'edit' || allowForking

  const {
    isBookmarked,
    loading: loadingBookmark,
    toggleBookmark,
  } = useTapestryBookmark({ tapestryId: id, userId: user?.id })

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
      element: (
        <IconButton icon="info" aria-label="About tapestry" onClick={() => setViewingInfo(true)} />
      ),
      tooltip: { side: 'bottom', children: 'About tapestry' },
    },
  ] as const satisfies MenuItems

  const infoDialogButtons = (
    <>
      {user && (
        <Button
          variant="secondary"
          className={styles.secondaryButton}
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
          {isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
        </Button>
      )}
      <Button
        variant="secondary"
        className={styles.secondaryButton}
        icon="upload"
        disabled={!canForkTapestry || !!progress}
        onClick={triggerExport}
        tooltip={
          canForkTapestry
            ? undefined
            : { children: "You don't have export permissions", side: 'bottom' }
        }
      >
        Export Zip file {progress && <ExportProgressIndicator progress={progress} />}
      </Button>
      <Button
        variant="primary"
        icon="content_copy"
        disabled={!canForkTapestry}
        tooltip={
          canForkTapestry
            ? undefined
            : { children: "You don't have forking permissions", side: 'bottom', offset: 16 }
        }
        onClick={() => {
          if (!user) {
            setJoinPopup(true)
          } else {
            setForkingTapestry(true)
          }
        }}
        className={styles.primaryButton}
      >
        Make a copy
      </Button>
    </>
  )

  return (
    <div className={clsx(styles.root, className)} style={style} ref={obstruction.ref}>
      <Toolbar isOpen items={items} />
      {viewingInfo && (
        <TapestryInfoDialog
          tapestry={{ title, description, thumbnail, createdAt, updatedAt }}
          owner={fullName(owner)}
          ownerAvatar={owner.avatar ? <Avatar user={owner} size="small" /> : undefined}
          onClose={() => setViewingInfo(false)}
          buttons={infoDialogButtons}
        />
      )}
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
    </div>
  )
}
