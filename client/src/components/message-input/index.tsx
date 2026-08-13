/* eslint-disable @typescript-eslint/no-empty-function */
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
import { textItemToolbar } from '../tapestry-elements/items/text/toolbar'
import { Toolbar } from 'tapestry-core-client/src/components/lib/toolbar'
import { useGenerateItemLink, useTapestryPath } from '../../hooks/use-tapestry-path'
import { useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { useItemPicker } from '../item-picker/use-item-picker'
import { idMapToArray } from 'tapestry-core/src/utils'
import { AssignActionModal, extractAction } from '../assign-action-button'

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

  const [showModal, setShowModal] = useState(false)
  const [linkAction, setLinkAction] = useState('')
  const [linkText, setLinkText] = useState('')

  const tapestryId = useTapestryData('id')
  const tapestryPath = useTapestryPath('view')

  const generateLink = useGenerateItemLink()
  const items = useTapestryData('items')

  const itemPicker = useItemPicker({
    onItemsChanged: ([id]) => {
      itemPicker.close()
      const item = idMapToArray(items).find((i) => i.dto.id === id)
      if (item) {
        setLinkAction(generateLink(id))
      }
    },
    isSelectable: (item) => item.dto.type !== 'actionButton',
  })

  const closeLinkModal = () => {
    setShowModal(false)
    setLinkAction('')
    setLinkText('')
  }

  const handleCreateLink = () => {
    if (selectionState?.isLink) {
      editorApiRef.current?.link('')
      return
    }
    const selected = editorApiRef.current?.selectionText() ?? ''
    setLinkText(selected)
    setLinkAction('')
    setShowModal(true)
  }

  const menuItems = textItemToolbar({
    selection: selectionState,
    tapestryId: '',
    editorAPI: editorApiRef,
    itemBackgroundColor: null,
    onBackgroundColorChange: () => {},
    onColorChange: () => {},
    onToggleMenu: () => {},
    onLinkClick: handleCreateLink,
    canAddLink: selectionState?.isLink,
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
                onSelectionChanged: setSelectionState,
                onCreateLink: () => {
                  handleCreateLink()
                  return true
                },
                onKeyDown: (e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    void submitMessage()
                  }
                },
              }}
            />

            {showModal && !itemPicker.isOpen && (
              <AssignActionModal
                onClose={closeLinkModal}
                action={linkAction}
                onActionChange={setLinkAction}
                text={linkText}
                onTextChange={setLinkText}
                onApply={(url, text) => {
                  const { action, actionType } = extractAction(url, tapestryPath, tapestryId)
                  if (!action) return

                  const href = actionType === 'internalLink' ? `${tapestryPath}?${action}` : action
                  const editor = editorApiRef.current?.editor()
                  if (!editor) return

                  const linkTextFinal = text?.trim() || url
                  const { from } = editor.state.selection

                  editor
                    .chain()
                    .focus()
                    .insertContent(linkTextFinal)
                    .setTextSelection({ from, to: from + linkTextFinal.length })
                    .command(({ commands }) => commands.setLink({ href }))
                    .setTextSelection(from + linkTextFinal.length)
                    .run()

                  closeLinkModal()
                }}
                onSelectItem={() => itemPicker.open()}
                showTextField={true}
              />
            )}
            {itemPicker.ui}
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
