import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { resource } from '../../services/rest-resources'

interface DeleteTapestryModalProps {
  id: string
  title: string
  onCancel?: () => unknown
  onConfirm?: () => unknown
}

export function DeleteTapestryModal({ id, title, onCancel, onConfirm }: DeleteTapestryModalProps) {
  const { perform: deleteTapestry } = useAsyncAction(
    async ({ signal }) => await resource('tapestries').destroy({ id }, { signal }),
    { onAfterAction: () => onConfirm?.() },
  )

  return (
    <SimpleModal
      title="Delete Tapestry"
      cancel={{ onClick: () => onCancel?.() }}
      confirm={{
        text: 'Delete',
        variant: 'primary-negative',
        onClick: deleteTapestry,
      }}
    >
      <Text>Are you sure you want to delete “{title}”?</Text>
      <br />
      <Text>By doing this you will lose you work and will not be able to restore it.</Text>
    </SimpleModal>
  )
}
