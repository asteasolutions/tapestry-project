import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal'

interface LinkActionModalProps {
  link: string
  onClose: () => unknown
  onEdit: () => unknown
  onDelete: () => unknown
}

export function LinkActionModal({ link, onClose, onEdit, onDelete }: LinkActionModalProps) {
  return (
    <SimpleModal
      title="Link"
      onClose={onClose}
      cancel={{ text: 'Edit', onClick: () => onEdit() }}
      confirm={{ text: 'Delete', onClick: () => onDelete() }}
    >
      <a href={link} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
        {link}
      </a>
    </SimpleModal>
  )
}
