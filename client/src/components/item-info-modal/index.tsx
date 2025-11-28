import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { ItemInfoModal as BaseItemInfoModal } from 'tapestry-core-client/src/components/tapestry/item-info-modal'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { updateItem } from '../../pages/tapestry/view-model/store-commands/items'
import { Textarea } from '../textarea'
import { getItemInfo } from 'tapestry-core-client/src/components/tapestry/item-info-modal/item-info'
import { InfoModal } from 'tapestry-core-client/src/components/lib/info-modal'

export const ItemInfoModal: typeof BaseItemInfoModal = ({ onClose, item }) => {
  const dispatch = useDispatch()
  const isEditMode = useTapestryData('interactionMode') === 'edit'
  const info = getItemInfo(item, isEditMode ? ['notes'] : ['position', 'size'])

  return (
    <InfoModal onClose={onClose} info={info}>
      {isEditMode && (
        <>
          <Text variant="bodySm" className="info-modal-key">
            Notes:
          </Text>
          <Textarea
            rows={4}
            typography="bodySm"
            className="info-modal-value"
            value={item.notes ?? ''}
            style={{ padding: '5px 10px' }}
            onChange={(e) =>
              dispatch(updateItem(item.id, { dto: { notes: e.target.value || null } }))
            }
          />
        </>
      )}
    </InfoModal>
  )
}
