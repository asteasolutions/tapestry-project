import { useState } from 'react'
import { Button, IconButton } from 'tapestry-core-client/src/components/lib/buttons'
import { Input } from 'tapestry-core-client/src/components/lib/input'
import { Modal } from 'tapestry-core-client/src/components/lib/modal'
import { ActionButtonItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { useItemPicker } from '../../../../item-picker/use-item-picker'
import { useDispatch, useTapestryData } from '../../../../../pages/tapestry/tapestry-providers'
import { idMapToArray } from 'tapestry-core/src/utils'
import { useGenerateItemLink } from '../../../../../hooks/use-tapestry-path'
import styles from './styles.module.css'
import { updateItem } from '../../../../../pages/tapestry/view-model/store-commands/items'

interface AssignActionModalProps {
  onClose: () => unknown
  dto: ActionButtonItemDto
  onSelectItem: () => unknown
  onApply: (action: string) => unknown
  initialAction?: string
}

function AssignActionModal({
  onClose,
  dto,
  onSelectItem,
  onApply,
  initialAction,
}: AssignActionModalProps) {
  const [action, setAction] = useState(initialAction ?? dto.action ?? '')

  return (
    <Modal onClose={() => onClose()} title="Assign action" classes={{ root: styles.modal }}>
      <div className={styles.inputContainer}>
        <div className={styles.actionContainer}>
          <Input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Input a link or select an item"
          />
          <IconButton
            icon="left_click"
            aria-label="Attach items"
            tooltip={{ side: 'bottom', children: 'Attach items' }}
            onClick={() => onSelectItem()}
          />
        </div>
        <Button onClick={() => onApply(action)}>Apply</Button>
      </div>
    </Modal>
  )
}

interface AssignActionProps {
  dto: ActionButtonItemDto
}

export function AssignAction({ dto }: AssignActionProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedItemUrl, setSelectedItemUrl] = useState<string>()

  const generateLink = useGenerateItemLink()
  const items = useTapestryData('items')
  const itemPicker = useItemPicker({
    onItemsChanged: ([id]) => {
      itemPicker.close()
      const item = idMapToArray(items).find((i) => i.dto.id === id)
      if (item) {
        setSelectedItemUrl(generateLink(id))
      }
    },
    isSelectable: (item) => item.dto.type !== 'actionButton',
  })

  const dispatch = useDispatch()

  return (
    <>
      <IconButton
        icon={dto.action ? 'link' : 'link_off'}
        aria-label="Assign action"
        onClick={() => setShowModal(true)}
      />
      {showModal && !itemPicker.isOpen && (
        <AssignActionModal
          onClose={() => {
            setShowModal(false)
            setSelectedItemUrl(undefined)
          }}
          dto={dto}
          onApply={(action) => {
            setShowModal(false)
            dispatch(updateItem(dto.id, { dto: { action } }))
          }}
          onSelectItem={() => itemPicker.open()}
          initialAction={selectedItemUrl}
        />
      )}
      {itemPicker.ui}
    </>
  )
}
