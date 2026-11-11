import { AdminTapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { resource } from '../../../../services/rest-resources'
import { ConfirmDeletionModal } from '../../components/confirm-deletion-modal'
import { pluralize } from '../../format'

export function DeleteTapestryDialog({
  tapestry,
  onDeleted,
  onCancel,
}: {
  tapestry: AdminTapestryDto
  onDeleted: () => unknown
  onCancel: () => unknown
}) {
  return (
    <ConfirmDeletionModal
      title={`Delete “${tapestry.title}” permanently?`}
      confirmationWord="delete"
      onCancel={onCancel}
      note="The deletion is recorded in the activity log, since the tapestry will leave no trace in the database."
      onConfirm={async () => {
        await resource('adminTapestries').destroy({ id: tapestry.id })
        onDeleted()
      }}
    >
      <p>This deletes the tapestry by @{tapestry.owner.username} and everything in it:</p>
      <ul>
        <li>{pluralize(tapestry.itemCount, 'item')}, with their connections and comments</li>
        {tapestry.invitedCount > 0 && (
          <li>Access for {pluralize(tapestry.invitedCount, 'invited person', 'invited people')}</li>
        )}
        {tapestry.featured && <li>Its place in the public Gallery</li>}
      </ul>
    </ConfirmDeletionModal>
  )
}
