import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { AdminTapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import styles from './styles.module.css'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'

interface FeatureDialogProps {
  tapestry: AdminTapestryDto
  onConfirm: () => Promise<unknown>
  onCancel: () => unknown
}

export function FeatureDialog({ tapestry, onConfirm, onCancel }: FeatureDialogProps) {
  const { loading, trigger } = useAsyncAction(onConfirm)

  return (
    <SimpleModal
      title={`Feature “${tapestry.title}” in the Gallery?`}
      cancel={{ onClick: onCancel, disabled: loading }}
      confirm={{
        text: 'Feature in Gallery',
        disabled: loading,
        onClick: trigger,
      }}
    >
      <div className={styles.root}>
        <p>
          It will appear first in the public Gallery, where anyone can find it. Its sharing stays
          “Anyone with the link”.
        </p>
        <p>
          You can reorder it or remove it from the Gallery later. If @{tapestry.owner.username}{' '}
          restricts sharing, it leaves the Gallery automatically.
        </p>
        <p className={styles.note}>This change is recorded in the activity log.</p>
      </div>
    </SimpleModal>
  )
}
