import { useState } from 'react'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons'
import { Input } from 'tapestry-core-client/src/components/lib/input'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal'
import { useItemPicker } from '../item-picker/use-item-picker'
import { useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { idMapToArray } from 'tapestry-core/src/utils'
import { useGenerateItemLink } from '../../hooks/use-tapestry-path'
import styles from './style.module.css'
import { Id } from 'tapestry-core/src/data-format/schemas/common'

interface AddLinkModalProps {
  onClose: () => unknown
  onApply: (link: string, text?: string) => unknown
  showTextField?: boolean
  initialLink?: string
  initialText?: string
  excludeItemId?: Id
  title?: string
}

export function AddLinkModal({
  onClose,
  onApply,
  initialLink,
  initialText,
  showTextField = false,
  excludeItemId,
  title = 'Add link',
}: AddLinkModalProps) {
  const [link, setLink] = useState(initialLink ?? '')
  const [text, setText] = useState(initialText ?? '')

  const generateLink = useGenerateItemLink()
  const items = useTapestryData('items')

  const itemPicker = useItemPicker({
    onItemsChanged: ([id]) => {
      itemPicker.close()
      const item = idMapToArray(items).find((i) => i.dto.id === id)
      if (item) {
        setLink(generateLink(id))
      }
    },
    isSelectable: (item) => item.dto.type !== 'actionButton' && item.dto.id !== excludeItemId,
  })

  const canApply = link.trim().length > 0
  return (
    <>
      {!itemPicker.isOpen && (
        <SimpleModal
          title={title}
          classes={{ root: styles.modal }}
          cancel={{ onClick: () => onClose() }}
          confirm={{
            text: 'Apply',
            disabled: !canApply,
            onClick: () => onApply(link, text || undefined),
          }}
        >
          <div className={styles.inputContainer}>
            <div className={styles.actionContainer}>
              {showTextField && (
                <Input
                  value={text}
                  label="Text"
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Input text (optional)"
                />
              )}
              <Input
                value={link}
                label="Link"
                onChange={(e) => setLink(e.target.value)}
                placeholder="Input a link or select an item"
                endAdornment={
                  <IconButton
                    //Add additional margin to fit the icon in the end adornment space
                    style={{ padding: 0, margin: '-3px 0' }}
                    icon="left_click"
                    aria-label="Attach items"
                    tooltip={{ side: 'bottom', children: 'Attach items' }}
                    onClick={() => itemPicker.open()}
                  />
                }
              />
            </div>
          </div>
        </SimpleModal>
      )}
      {itemPicker.ui}
    </>
  )
}
