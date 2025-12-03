import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import {
  Button,
  IconButton,
  MenuItemButton,
} from 'tapestry-core-client/src/components/lib/buttons/index'
import { Toolbar } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { useState } from 'react'
import { useOutsideClick } from 'tapestry-core-client/src/components/lib/hooks/use-outside-click'
import { Link } from 'react-router'
import { DeleteTapestryModal } from '../../../components/delete-tapestry-modal'
import { ShareDialog } from '../../../components/share-dialog'
import { fullName, userAccess } from '../../../model/data/utils'
import { useSession } from '../../../layouts/session'
import { ForkTapestryDialog } from '../../../components/fork-tapestry-dialog'
import { EditTapestryDialog } from '../../../components/edit-tapestry-dialog'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { TapestryInfo } from '../../../components/tapestry-dialog'
import { resource } from '../../../services/rest-resources'
import { TapestryInfoDialog } from 'tapestry-core-client/src/components/tapestry/tapestry-info-dialog'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { tapestryPath } from '../../../utils/paths'
import { TapestryListItem } from '../tapestry-list'

interface TapestryCardProps {
  tapestry: TapestryListItem
  onTapestryDeleted?: () => unknown
  onTapestryModified?: () => unknown
}

export function TapestryCard({
  tapestry,
  onTapestryDeleted,
  onTapestryModified,
}: TapestryCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuContainerRef = useOutsideClick<HTMLDivElement>(() => setIsMenuOpen(false))
  // TODO: Implement a hook, which provides the controls and JSX for the modals
  const [deletingTapestry, setDeletingTapestry] = useState(false)
  const [editingTapestry, setEditingTapestry] = useState<boolean | 'with-back'>(false)
  const [forkingTapestry, setForkingTapestry] = useState(false)
  const [sharingTapestry, setSharingTapestry] = useState(false)
  const [viewingInfo, setViewingInfo] = useState(false)

  const { perform: edit, error } = useAsyncAction(
    ({ signal }, { title, slug, description }: TapestryInfo) =>
      resource('tapestries').update(
        { id: tapestry.id },
        { title, slug, description: description ?? '' },
        undefined,
        { signal },
      ),
  )

  const { user } = useSession()
  const canEdit = userAccess(tapestry, user?.id) === 'edit'
  const isOwner = tapestry.ownerId === user?.id
  const viewUrl = tapestryPath(tapestry.owner.username, tapestry.slug)
  const editUrl = tapestryPath(tapestry.owner.username, tapestry.slug, 'edit')
  const canForkTapestry = canEdit || tapestry.allowForking

  return (
    <div className={styles.root}>
      {tapestry.isBookmarked && <Icon icon="bookmark" className={styles.bookmark} inert />}
      <Link to={viewUrl} style={{ color: 'transparent' }}>
        <div className={styles.preview}>
          {tapestry.thumbnail ? (
            <img src={tapestry.thumbnail} className={styles.thumbnail} />
          ) : (
            <Icon icon="wallpaper" style={{ fontSize: 100, color: 'var(--color-neutral-150)' }} />
          )}
        </div>
      </Link>

      <div className={styles.info}>
        <Text lineClamp={tapestry.description ? 2 : 3} variant="bodySm" className={styles.title}>
          {tapestry.title}
        </Text>
        <div className={styles.cardButtons}>
          <IconButton
            icon="info"
            aria-label="View info"
            tooltip={{ side: 'bottom', children: 'View info' }}
            onClick={() => setViewingInfo(true)}
          />
          {user && !canEdit && (
            <IconButton
              icon="content_copy"
              disabled={!canForkTapestry}
              onClick={() => setForkingTapestry(true)}
              aria-label="Make a copy"
              tooltip={{
                side: 'bottom',
                children: canForkTapestry ? 'Make a copy' : "You don't have forking permissions",
              }}
            />
          )}
          {canEdit && (
            <>
              <IconButton
                component={Link}
                to={editUrl}
                icon="edit"
                aria-label="Edit"
                tooltip={{ side: 'bottom', children: 'Edit' }}
              />
              <div className={styles.moreButtonContainer} ref={menuContainerRef}>
                <IconButton
                  icon="more_vert"
                  aria-label="More actions"
                  onClick={() => setIsMenuOpen((t) => !t)}
                  isActive={isMenuOpen}
                  tooltip={{ side: 'bottom', children: 'Options' }}
                />
                <Toolbar
                  isOpen={isMenuOpen}
                  className={styles.moreMenu}
                  direction="column"
                  items={[
                    <MenuItemButton
                      icon="group_add"
                      onClick={() => {
                        setSharingTapestry(true)
                        setIsMenuOpen(false)
                      }}
                    >
                      Share
                    </MenuItemButton>,
                    <MenuItemButton
                      icon="content_copy"
                      onClick={() => {
                        setIsMenuOpen(false)
                        setForkingTapestry(true)
                      }}
                    >
                      Make a copy
                    </MenuItemButton>,
                    isOwner && (
                      <MenuItemButton
                        icon="edit_note"
                        onClick={() => {
                          setEditingTapestry(true)
                          setIsMenuOpen(false)
                        }}
                      >
                        Edit title and description
                      </MenuItemButton>
                    ),
                    isOwner && (
                      <MenuItemButton
                        icon="delete"
                        variant="negative"
                        onClick={() => {
                          setDeletingTapestry(true)
                          setIsMenuOpen(false)
                        }}
                      >
                        Delete
                      </MenuItemButton>
                    ),
                  ]}
                />
              </div>
            </>
          )}
        </div>
        <Text className={styles.description} lineClamp={3} variant="bodySm">
          {tapestry.description}
        </Text>
      </div>
      {deletingTapestry && (
        <DeleteTapestryModal
          id={tapestry.id}
          title={tapestry.title}
          onCancel={() => setDeletingTapestry(false)}
          onConfirm={() => {
            setDeletingTapestry(false)
            onTapestryDeleted?.()
          }}
        />
      )}
      {sharingTapestry && (
        <ShareDialog tapestryId={tapestry.id} onClose={() => setSharingTapestry(false)} />
      )}
      {forkingTapestry && (
        <ForkTapestryDialog
          onClose={() => setForkingTapestry(false)}
          tapestryId={tapestry.id}
          tapestryInfo={{
            title: tapestry.title,
            description: tapestry.description ?? undefined,
          }}
        />
      )}
      {editingTapestry && (
        <EditTapestryDialog
          tapestryInfo={{
            title: tapestry.title,
            slug: tapestry.slug,
            description: tapestry.description ?? undefined,
          }}
          onClose={() => setEditingTapestry(false)}
          onCancel={() => {
            setEditingTapestry(false)
            if (editingTapestry === 'with-back') {
              setViewingInfo(true)
            }
          }}
          handleSubmit={async (tapestryInfo) => {
            await edit(tapestryInfo)
            setEditingTapestry(false)
            onTapestryModified?.()
          }}
          error={error}
          cancelText={editingTapestry === 'with-back' ? 'Back' : 'Cancel'}
        />
      )}
      {viewingInfo && (
        <TapestryInfoDialog
          tapestry={tapestry}
          owner={fullName(tapestry.owner)}
          onClose={() => setViewingInfo(false)}
          buttons={
            <>
              {isOwner && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setViewingInfo(false)
                    setEditingTapestry('with-back')
                  }}
                >
                  Edit
                </Button>
              )}
              <Button component={Link} to={viewUrl}>
                Go to Tapestry
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}
