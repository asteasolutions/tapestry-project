import { MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useDispatch } from '../../../pages/tapestry/tapestry-providers'
import { DataTransferHandler } from '../../../stage/data-transfer-handler'
import { insertDataTransfer } from '../../../pages/tapestry/view-model/utils'

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
        await insertDataTransfer(dispatch, () =>
          new DataTransferHandler().pasteClipboard(tapestryId),
        )

        onPaste()
      }}
    >
      Paste
    </MenuItemButton>
  )
}
