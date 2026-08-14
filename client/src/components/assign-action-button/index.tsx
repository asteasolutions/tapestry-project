import { useState } from 'react'
import { IconButton, IconButtonProps } from 'tapestry-core-client/src/components/lib/buttons'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { useTapestryPath } from '../../hooks/use-tapestry-path'
import { updateItem } from '../../pages/tapestry/view-model/store-commands/items'
import { ActionButtonItem, ActionItemType } from 'tapestry-core/src/data-format/schemas/item'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { AddLinkModal } from '../add-link-modal'

type ActionItemDto = Extract<ItemDto, { type: ActionItemType }>

export function extractAction(url: string | null, tapestryPath: string, tapestryId: Id) {
  if (!url) {
    return {
      action: null,
      actionType: null,
    }
  }

  const actionType: ActionButtonItem['actionType'] =
    url.includes(tapestryPath) || url.includes(`/t/${tapestryId}`) ? 'internalLink' : 'externalLink'

  const action = actionType === 'externalLink' ? url : new URL(url).searchParams.toString()

  return { action, actionType }
}

interface AssignActionProps {
  dto: ActionItemDto
  icon?: IconButtonProps['icon']
}

export function AssignActionButton({ dto, icon = 'link' }: AssignActionProps) {
  const [showModal, setShowModal] = useState(false)
  const tapestryPath = useTapestryPath('view')
  const tapestryId = useTapestryData('id')
  const dispatch = useDispatch()

  return (
    <>
      <IconButton icon={icon} aria-label="Assign action" onClick={() => setShowModal(true)} />
      {showModal && (
        <AddLinkModal
          title="Assign action"
          onClose={() => setShowModal(false)}
          initialLink={dto.action ?? undefined}
          excludeItemId={dto.id}
          onApply={(url) => {
            setShowModal(false)
            const { action, actionType } = extractAction(url, tapestryPath, tapestryId)
            dispatch(updateItem(dto.id, { dto: { action, actionType } }))
          }}
        />
      )}
    </>
  )
}
