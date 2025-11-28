import { TapestryDialog, TapestryInfo } from '../tapestry-dialog'

interface EditTapestryDialogProps {
  onClose?: () => unknown
  tapestryInfo: TapestryInfo
  handleSubmit: (tapestryInfo: TapestryInfo) => Promise<void>
  error?: unknown
  onCancel: () => unknown
  cancelText?: string
}

export function EditTapestryDialog({
  onClose,
  onCancel,
  handleSubmit,
  error,
  tapestryInfo,
  cancelText,
}: EditTapestryDialogProps) {
  return (
    <TapestryDialog
      onClose={onClose}
      title="Edit title and description"
      submitText="Update details"
      tapestryInfo={tapestryInfo}
      handleSubmit={({ title, slug, description }) =>
        handleSubmit({ title, slug, description: description ?? '' })
      }
      error={error}
      onCancel={onCancel}
      cancelText={cancelText}
    />
  )
}
