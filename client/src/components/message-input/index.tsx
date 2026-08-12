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
import { LinkTooltip, LinkTooltipProps } from '../tapestry-elements/items/text/link-tooltip'

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

const TRAILING_EMPTY_PARAGRAPHS_REGEX = /(<p><br><\/p>)+$/

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
  const [addLinkProps, setAddLinkProps] = useState<
    Pick<LinkTooltipProps, 'element' | 'content'> | undefined
  >(undefined)
  const editorApiRef = useRef<RichTextEditorApi | undefined>(undefined)

  const handleCreateLink = (domNode?: HTMLElement) => {
    const editor = editorApiRef.current?.editor()
    if (!editor) return

    if (selectionState?.isLink) {
      editorApiRef.current?.link('')
      setAddLinkProps(undefined)
      return
    }

    const selectionStartDOMNode = editor.view.domAtPos(editor.state.selection.from).node
    const anchorElement =
      selectionStartDOMNode instanceof HTMLElement
        ? selectionStartDOMNode
        : selectionStartDOMNode.parentElement

    if (!anchorElement) return

    setAddLinkProps({
      content: editorApiRef.current?.selectionText(),
      element: domNode ?? anchorElement,
    })
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

    const cleanedInput = plainText.replace(TRAILING_EMPTY_PARAGRAPHS_REGEX, '')

    await onSubmit(cleanedInput)

    setInput('')
    editorApiRef.current?.editor().commands.clearContent()
  })

  const isDisabled = !!disabled || isSubmitting

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
            {addLinkProps && (
              <LinkTooltip
                element={addLinkProps.element}
                content={addLinkProps.content}
                onRemove={() => {
                  const editor = editorApiRef.current?.editor()
                  if (editor) {
                    editor.commands.focus()
                    editorApiRef.current?.link('')
                  }
                  setAddLinkProps(undefined)
                }}
                onApply={(url: string, text?: string) => {
                  const api = editorApiRef.current
                  const editor = api?.editor()

                  if (editor) {
                    editor.commands.focus()
                    const selectedText = api!.selectionText()

                    const isInternal =
                      url.startsWith('/') ||
                      url.startsWith('#') ||
                      url.includes(window.location.origin)
                    const target = isInternal ? '_self' : '_blank'

                    if (text && text !== selectedText) {
                      editor
                        .chain()
                        .focus()
                        .insertContent(`<a href="${url}" target="${target}">${text}</a>`)
                        .run()
                    } else {
                      editor.chain().focus().setLink({ href: url, target }).run()
                    }
                  }

                  setAddLinkProps(undefined)
                }}
              />
            )}

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
              isEditable={!isDisabled}
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
