import clsx from 'clsx'
import { useRef, useState } from 'react'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { FilePicker } from 'tapestry-core-client/src/components/lib/file-picker/index'
import { useKeyboardShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-keyboard-shortcuts'
import { useSingleChoice } from 'tapestry-core-client/src/components/lib/hooks/use-single-choice'
import { ShortcutLabel } from 'tapestry-core-client/src/components/lib/shortcut-label'
import { SubmitOnBlurInput } from 'tapestry-core-client/src/components/lib/submit-on-blur-input/index'
import { SubmenuIds } from 'tapestry-core-client/src/components/lib/toolbar'
import { MenuItems, Toolbar } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { useViewportObstruction } from 'tapestry-core-client/src/components/tapestry/hooks/use-viewport-obstruction'
import { shortcutLabel } from 'tapestry-core-client/src/lib/keyboard-event'
import { OneOrMore } from 'tapestry-core/src/utils'
import { MediaItemSource } from '../../../lib/media'
import { createActionButtonItem, createTextItem } from '../../../model/data/utils'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { addAndPositionItems } from '../../../pages/tapestry/view-model/store-commands/items'
import { setSnackbar } from '../../../pages/tapestry/view-model/store-commands/tapestry'
import { createItemViewModel, insertDataTransfer } from '../../../pages/tapestry/view-model/utils'
import { DataTransferHandler, InvalidSourceError } from '../../../stage/data-transfer-handler'
import { MediaCaptureDialog } from '../../media-capture-dialog'
import { ThemeSelector } from '../../theme-selector'
import styles from './styles.module.css'

const dataTransferHandler = new DataTransferHandler()

interface GlobalMenuProps {
  className?: string
}

export function ImportToolbar({ className }: GlobalMenuProps) {
  const obstruction = useViewportObstruction({ clear: { top: true, bottom: true, left: true } })
  const uploadButtonRef = useRef<HTMLButtonElement>(null)
  const tapestryId = useTapestryData('id')
  const dispatch = useDispatch()

  const [showMediaCaptureDialog, setShowMediaCaptureDialog] = useState(false)
  const [mediaCaptureMinimized, setMediaCaptureMinimized] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const openMediaCaptureDialog = () => {
    setMediaCaptureMinimized(false)
    setShowMediaCaptureDialog(true)
  }

  useKeyboardShortcuts({
    KeyI: () => uploadButtonRef.current?.click(),
    'meta + KeyK | KeyK': () => selectSubmenu('add-link'),
    KeyR: openMediaCaptureDialog,
  })

  const addToTapestry = (source: OneOrMore<MediaItemSource>) =>
    insertDataTransfer(dispatch, () => dataTransferHandler.deserialize(source, tapestryId))

  const items = [
    {
      element: (
        <FilePicker
          accept="image/*,application/pdf,video/*,application/epub+zip,audio/*,text/*,.webloc,.url"
          multiple
          onChange={addToTapestry}
        >
          <IconButton aria-label="Import file" icon="upload_file" ref={uploadButtonRef} />
        </FilePicker>
      ),
      tooltip: {
        side: 'right',
        children: <ShortcutLabel text="Import files">I</ShortcutLabel>,
      },
    },
    {
      id: 'add-link',
      ui: {
        element: (
          <IconButton
            aria-label="Add link"
            icon="add_link"
            onClick={() => selectSubmenu('add-link')}
          />
        ),
        tooltip: {
          side: 'right',
          children: <ShortcutLabel text="Add link">{shortcutLabel('meta + K')}</ShortcutLabel>,
        },
      },
      submenu: [
        <SubmitOnBlurInput
          value=""
          autoFocus
          onKeyDown={(e) => {
            if (e.code === 'Escape') {
              close()
            }
          }}
          onSubmit={async (val) => {
            if (!val) return close()

            try {
              await addToTapestry(val)
            } catch (error) {
              if (error instanceof InvalidSourceError) {
                dispatch(setSnackbar({ text: 'Invalid url', variant: 'error', duration: 5 }))
              } else {
                throw error
              }
            } finally {
              close()
            }
          }}
          placeholder="Paste your link here"
        />,
      ],
    },
    {
      element: (
        <IconButton
          icon="text_fields"
          aria-label="Insert text"
          onClick={() =>
            dispatch(addAndPositionItems(createItemViewModel(createTextItem('', tapestryId))))
          }
        />
      ),
      tooltip: { side: 'right', children: <ShortcutLabel text="Text">T</ShortcutLabel> },
    },
    {
      element: (
        <IconButton
          icon="radio_button_checked"
          aria-label="Create a recording"
          onClick={openMediaCaptureDialog}
          className={clsx({ [styles.recording]: isRecording && mediaCaptureMinimized })}
        />
      ),
      tooltip: {
        side: 'right',
        children: <ShortcutLabel text="Record audio or video">R</ShortcutLabel>,
      },
    },
    {
      element: (
        <IconButton
          icon={{ name: 'dashboard_customize', fill: true }}
          aria-label="Add a button"
          onClick={() =>
            dispatch(
              addAndPositionItems(createItemViewModel(createActionButtonItem('', tapestryId))),
            )
          }
        />
      ),
      tooltip: {
        side: 'right',
        children: 'Add a button',
      },
    },
    'separator',
    {
      id: 'theme',
      ui: {
        element: (
          <IconButton icon="palette" aria-label="Theme" onClick={() => selectSubmenu('theme')} />
        ),
        tooltip: { side: 'right', children: 'Background' },
      },
      submenu: [<ThemeSelector />],
    },
  ] as const satisfies MenuItems

  const [selectedSubmenu, selectSubmenu, close] = useSingleChoice<SubmenuIds<typeof items>>()

  return (
    <>
      <Toolbar
        wrapperRef={obstruction.ref}
        isOpen
        className={className}
        selectedSubmenu={selectedSubmenu}
        onFocusOut={close}
        items={items}
        direction="column"
      />
      {showMediaCaptureDialog && (
        <MediaCaptureDialog
          onClose={() => setShowMediaCaptureDialog(false)}
          onRecordingStateChange={setIsRecording}
          onMinimize={() => setMediaCaptureMinimized(true)}
          minimized={mediaCaptureMinimized}
          onAddToTapestry={(source) => {
            void addToTapestry(source)
            setShowMediaCaptureDialog(false)
          }}
        />
      )}
    </>
  )
}
