import { useState } from 'react'
import { ItemPicker, ItemPickerProps } from '.'
import { createPortal } from 'react-dom'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { useKeyboardShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-keyboard-shortcuts'

type UseItemPickerProps = Omit<ItemPickerProps, 'initialSelection'> & {
  onClose?: () => void
}

export function useItemPicker({ onClose, ...itemPickerProps }: UseItemPickerProps) {
  const [initialSelection, setInitialSelection] = useState<string[] | null>(null)

  function open(initialSelection: string[] = []) {
    setInitialSelection(initialSelection)
  }

  function close() {
    setInitialSelection(null)
    onClose?.()
  }

  // We want to capture the escape key before other handlers (like the item toolbar)
  useKeyboardShortcuts(
    {
      Escape: () => {
        // If the picker is not opened return true so that the event's propagation is not stopped
        if (!initialSelection) {
          return true
        }
        close()
      },
    },
    undefined,
    true,
  )

  const itemPicker = initialSelection
    ? createPortal(
        <ItemPicker initialSelection={initialSelection} {...itemPickerProps} />,
        document.querySelector('#item-picker')!,
        'item-picker',
      )
    : null

  const doneButton = initialSelection
    ? createPortal(
        <Button aria-label="Done" onClick={close} className="titlebar-action-done">
          Done <Icon icon="check_circle" />
        </Button>,
        document.querySelector('#titlebar-action-buttons')!,
        'done-button',
      )
    : null

  return { open, close, ui: [itemPicker, doneButton], isOpen: !!initialSelection }
}
