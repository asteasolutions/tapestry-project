import clsx from 'clsx'
import { useState } from 'react'
import { Button, IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { ShortcutLabel } from 'tapestry-core-client/src/components/lib/shortcut-label'
import { Toolbar } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { useViewportObstruction } from 'tapestry-core-client/src/components/tapestry/hooks/use-viewport-obstruction'
import { SearchButton } from 'tapestry-core-client/src/components/tapestry/search/search-button'
import { shortcutLabel } from 'tapestry-core-client/src/lib/keyboard-event'
import Gemini from '../../../assets/icons/gemini.svg?react'
import { useTapestryPath } from '../../../hooks/use-tapestry-path'
import { useSession } from '../../../layouts/session'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import {
  setSidePane,
  setSnackbar,
} from '../../../pages/tapestry/view-model/store-commands/tapestry'
import { CommentButton } from '../../comment-button'
import { JoinTapestriesModal } from '../../join-tapestries-modal'
import { ShareDialog } from '../../share-dialog'
import { UserMenu } from '../../user-menu'
import styles from './styles.module.css'

interface UserToolbarProps {
  className?: string
}

export function UserToolbar({ className }: UserToolbarProps) {
  const obstruction = useViewportObstruction({ clear: { top: true, right: true } })
  const [joinPopup, setJoinPopup] = useState(false)
  const [sharePopup, setSharePopup] = useState(false)
  const tapestryViewPath = useTapestryPath('view')
  const { id, commentThread, userAccess, visibility } = useTapestryData([
    'id',
    'commentThread',
    'userAccess',
    'visibility',
  ])
  const dispatch = useDispatch()
  const { user } = useSession()

  async function share() {
    if (userAccess === 'edit') {
      setSharePopup(true)
    } else {
      await navigator.clipboard.writeText(`${window.origin}${tapestryViewPath}`)
      dispatch(setSnackbar('Share link copied to clipboard'))
    }
  }

  return (
    <>
      <Toolbar
        wrapperRef={obstruction.ref}
        isOpen
        className={clsx(styles.root, className)}
        items={[
          {
            element: <SearchButton />,
            tooltip: {
              side: 'bottom',
              children: <ShortcutLabel text="Search items">{shortcutLabel('/')}</ShortcutLabel>,
            },
          },
          {
            element: (
              <IconButton
                icon={Gemini}
                aria-label="Gemini chat"
                className={styles.gemini}
                onClick={() => dispatch(setSidePane('ai-chat', true))}
              />
            ),
            tooltip: { side: 'bottom', children: 'Ask Gemini' },
          },
          {
            element: <CommentButton count={commentThread?.size} type="general-comments" />,
            tooltip: { side: 'bottom', children: 'Comments' },
          },
          (visibility !== 'private' || userAccess === 'edit') && {
            element: <IconButton icon="share" aria-label="Share" onClick={share} />,
            tooltip: { side: 'bottom', children: 'Share' },
          },
          user ? (
            <UserMenu user={user} className={styles.avatarContainer} />
          ) : (
            <Button
              size="small"
              onClick={() => {
                setJoinPopup(true)
              }}
            >
              Sign in
            </Button>
          ),
        ]}
      />
      {joinPopup && <JoinTapestriesModal onClose={() => setJoinPopup(false)} />}
      {sharePopup && <ShareDialog tapestryId={id} onClose={() => setSharePopup(false)} />}
    </>
  )
}
