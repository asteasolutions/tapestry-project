import { useDispatch } from '../../../pages/tapestry/tapestry-providers'
import { addAndPositionItems } from '../../../pages/tapestry/view-model/store-commands/items'
import {
  setInteractiveElement,
  setIAImport,
} from '../../../pages/tapestry/view-model/store-commands/tapestry'
import { createItemViewModel } from '../../../pages/tapestry/view-model/utils'
import { DataTransferHandler } from '../../../stage/data-transfer-handler'
import { MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons/index'

interface PasteButtonProps {
  tapestryId: string
  onPaste: () => unknown
}

export function PasteButton({ tapestryId, onPaste }: PasteButtonProps) {
  const dispatch = useDispatch()

  return (
    <MenuItemButton
      icon="content_paste"
      onClick={async () => {
        const deserializeResult = await new DataTransferHandler().pasteClipboard(tapestryId)

        if (deserializeResult.iaImport) {
          dispatch(setIAImport(deserializeResult.iaImport))
        } else if (deserializeResult.items.length > 0) {
          const viewModels = deserializeResult.items.map(createItemViewModel)

          dispatch(
            addAndPositionItems(viewModels),
            viewModels.length === 1 &&
              setInteractiveElement({ modelId: viewModels[0].dto.id, modelType: 'item' }),
          )
        }
        onPaste()
      }}
    >
      Paste
    </MenuItemButton>
  )
}
