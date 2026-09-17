import { intlFormat } from 'date-fns'
import { ReactNode } from 'react'
import { Tapestry } from 'tapestry-core/src/data-format/schemas/tapestry'
import { Icon } from '../../../../src/components/lib/icon/index'
import { Modal } from '../../../../src/components/lib/modal/index'
import { Text } from '../../../../src/components/lib/text/index'
import styles from './styles.module.css'

export interface TapestryInfoDialogProps {
  tapestry: Pick<Tapestry, 'title' | 'thumbnail' | 'description' | 'createdAt' | 'updatedAt'>
  owner: string
  ownerAvatar?: ReactNode
  onClose: () => void
  buttons?: ReactNode
}

export function TapestryInfoDialog({
  tapestry: { thumbnail, title, description, createdAt, updatedAt },
  owner,
  ownerAvatar,
  onClose,
  buttons,
}: TapestryInfoDialogProps) {
  return (
    <Modal
      title={
        <Text variant="h5" style={{ fontWeight: 500 }}>
          About this tapestry
        </Text>
      }
      onClose={onClose}
      classes={{ root: styles.root }}
    >
      <div className={styles.container}>
        {thumbnail ? (
          <img src={thumbnail} className={styles.thumbnail} />
        ) : (
          <Icon
            component="div"
            icon="wallpaper"
            className={styles.thumbnail}
            style={{ fontSize: 100, height: '210px', color: 'var(--color-neutral-150)' }}
          />
        )}
        <Text component="div" variant="h6" style={{ fontWeight: 600 }} className={styles.title}>
          {title}
        </Text>
        <div className={styles.details}>
          {owner && (
            <>
              <Text variant="bodySm">Author</Text>
              <div className={styles.ownerWrapper}>
                {ownerAvatar}
                <Text>{owner}</Text>
              </div>
            </>
          )}
          <Text variant="bodySm">Created</Text>
          <Text>{intlFormat(createdAt, { dateStyle: 'medium' })}</Text>
          <Text variant="bodySm">Last updated</Text>
          <Text>{intlFormat(updatedAt, { dateStyle: 'medium' })}</Text>
          {description && (
            <>
              <Text variant="bodySm">Description</Text>
              <Text>{description}</Text>
            </>
          )}
        </div>
      </div>
      {buttons && (
        <>
          <hr className={styles.separator} />
          <div className={styles.buttonsContainer}>{buttons}</div>
        </>
      )}
    </Modal>
  )
}
