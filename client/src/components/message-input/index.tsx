import { useSession } from '../../layouts/session'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import styles from './styles.module.css'
import { ReactNode, useRef, useState } from 'react'
import { JoinTapestriesModal } from '../join-tapestries-modal'
import clsx from 'clsx'
import {
  RichTextEditor,
  RichTextEditorApi,
  SelectionState,
} from 'tapestry-core-client/src/components/lib/rich-text-editor'
import { richTextEditorToolbar } from '../tapestry-elements/items/text/toolbar'
import { Toolbar } from 'tapestry-core-client/src/components/lib/toolbar'
import { useTapestryPath } from '../../hooks/use-tapestry-path'
import { useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { noop } from 'lodash'
import { isMeta } from 'tapestry-core-client/src/lib/keyboard-event'
import { useTextboxLink } from '../../hooks/use-textbox-link'

export interface MessageInputProps {
  onSubmit: (text: string) => unknown
  onPaste?: (data: DataTransfer) => string | undefined
  disabled?: boolean
  placeholder?: string
  signInButtonText?: string
  value?: string
  className?: string
  startAdornment?: ReactNode
  endAdornment?: ReactNode
}

const TRAILING_EMPTY_PARAGRAPHS_REGEX = /(<p>(\s|<br\s*\/?>)*<\/p>)+$/gi

export function MessageInput({
  onSubmit,
  disabled,
  placeholder,
  signInButtonText,
  value,
  className,
  startAdornment,
  endAdornment,
}: MessageInputProps) {
  const [input, setInput] = useState(value ?? '')
  const [joinPopup, setJoinPopup] = useState(false)
  const { user } = useSession()

  const [selectionState, setSelectionState] = useState<SelectionState | undefined>(undefined)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const editorApiRef = useRef<RichTextEditorApi | undefined>(undefined)

  const tapestryId = useTapestryData('id')
  const tapestryPath = useTapestryPath('view')

  const {
    addLink,
    closeLinkModal,
    addingLink,
    ui: linkModalUi,
  } = useTextboxLink({
    editorAPI: editorApiRef,
    tapestryId,
    tapestryPath,
    isEditable: true,
  })

  //TODO: We should change the types of the hook so that
  //if a respective controls flag is false the property here
  //cannot be passed, i.e. we passed controls.color === false,
  //so it doesn't make sense to pass an onColorChange at all
  const menuItems = richTextEditorToolbar({
    selection: selectionState,
    tapestryId: tapestryId,
    editorAPI: editorApiRef,
    itemBackgroundColor: null,
    onBackgroundColorChange: noop,
    onColorChange: noop,
    onToggleMenu: noop,
    onLinkClick: () => {
      if (addingLink) {
        closeLinkModal()
      } else {
        addLink()
      }
    },
    addingLink,
    controls: {
      fontFamily: false,
      fontSize: false,
      color: false,
      justification: false,
    },
  })

  const { perform: submitMessage, loading: isSubmitting } = useAsyncAction(async () => {
    const plainText = editorApiRef.current?.text().trim()
    if (!plainText) return

    const cleanedInput = input.replace(TRAILING_EMPTY_PARAGRAPHS_REGEX, '')

    await onSubmit(cleanedInput)
    setInput('')
    editorApiRef.current?.editor().commands.clearContent()
  })

  const hasContent = !!editorApiRef.current?.text().trim()
  const isDisabled = !!disabled || isSubmitting || !hasContent

  return (
    <div className={clsx(styles.root, className)}>
      {user ? (
        <>
          {/* XXX: Start and end adornments are currently not very dynamic. Some specific dimensions for them are
          assumed and if, for example, the adornments are much larger or smaller than 32px, they may look bad or overlap
          other content. If we want to extend the "adornment" abstraction, we need to figure out how to fix this. */}
          <div
            className={clsx(styles.messageInputWrapper, {
              [styles.withStartAdornment]: !!startAdornment,
              [styles.withEndAdornment]: !!endAdornment,
            })}
            data-value={input}
          >
            {startAdornment && <div className={styles.startAdornment}>{startAdornment}</div>}

            {isEditorReady && (
              <div className={styles.editorToolbar}>
                <Toolbar isOpen={true} items={menuItems} />
                <div>
                  {endAdornment}
                  <Button
                    variant="primary"
                    icon={{ name: 'send', fill: true }}
                    aria-label="Send"
                    disabled={isDisabled}
                    tooltip={{ side: 'bottom', children: 'Send' }}
                    onClick={submitMessage}
                  />
                </div>
              </div>
            )}

            <RichTextEditor
              className={styles.messageInput}
              value={value ?? ''}
              isEditable={true}
              api={editorApiRef}
              placeholder={placeholder}
              controls={{
                color: false,
                justification: false,
                fontFamily: false,
                fontSize: false,
              }}
              events={{
                onCreate: () => setIsEditorReady(true),
                onChange: setInput,
                onSelectionChanged: (state) => {
                  setSelectionState(state)
                  closeLinkModal()
                },
                onCreateLink: () => {
                  addLink()
                  return true
                },
                onClick: (e) => {
                  const anchor = (e.target as HTMLElement).closest('a')
                  if (!e.isDefaultPrevented() && anchor) {
                    editorApiRef.current?.editor().chain().extendMarkRange('link').run()
                    addLink()
                  }
                },
                onKeyDown: (e) => {
                  if (e.key === 'Enter' && isMeta(e.nativeEvent)) {
                    e.preventDefault()
                    void submitMessage()
                  }
                },
              }}
            />
            {linkModalUi}
          </div>
        </>
      ) : (
        <Button variant="secondary" onClick={() => setJoinPopup(true)}>
          {signInButtonText ?? 'Sign in to comment'}
        </Button>
      )}
      {joinPopup && <JoinTapestriesModal onClose={() => setJoinPopup(false)} />}
    </div>
  )
}
