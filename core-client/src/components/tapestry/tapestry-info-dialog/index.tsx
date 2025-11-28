import { intlFormat } from 'date-fns'
import { ReactNode } from 'react'
import { Tapestry } from 'tapestry-core/src/data-format/schemas/tapestry'
import { Icon } from '../../../../src/components/lib/icon/index'
import { Modal } from '../../../../src/components/lib/modal/index'
import { Text } from '../../../../src/components/lib/text/index'
import styles from './styles.module.css'

export interface TapestryInfoDialogProps {
  tapestry: Pick<Tapestry, 'title' | 'thumbnail' | 'description'>
  owner: string
  createdAt?: Date
  onClose: () => void
  buttons?: ReactNode
}

export function TapestryInfoDialog({
  tapestry,
  owner,
  createdAt,
  onClose,
  buttons,
}: TapestryInfoDialogProps) {
  return (
    <Modal
      title={
        <Text variant="h5" style={{ fontWeight: 500 }}>
          Tapestry info
        </Text>
      }
      onClose={onClose}
      classes={{ root: styles.root }}
    >
      <div className={styles.container}>
        {tapestry.thumbnail ? (
          <img src={tapestry.thumbnail} className={styles.thumbnail} />
        ) : (
          <Icon
            component="div"
            icon="wallpaper"
            className={styles.thumbnail}
            style={{ fontSize: 100, height: '210px', color: 'var(--color-neutral-150)' }}
          />
        )}
        <Text component="div" variant="h6" style={{ fontWeight: 600 }} className={styles.title}>
          {tapestry.title}
        </Text>
        <div className={styles.details}>
          <Text variant="bodySm">Owner</Text>
          <Text>{owner}</Text>
          {createdAt && (
            <>
              <Text variant="bodySm">Created</Text>
              <Text>
                {intlFormat(createdAt, {
                  dateStyle: 'medium',
                })}
              </Text>
            </>
          )}
          {tapestry.description && (
            <>
              <Text variant="bodySm">Description</Text>
              <Text>{tapestry.description}</Text>
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
