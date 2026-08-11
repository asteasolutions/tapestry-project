import { useSession } from '../../layouts/session'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { Avatar } from '../avatar'
import styles from './styles.module.css'
import { ReactNode, useRef, useState } from 'react'
import { JoinTapestriesModal } from '../join-tapestries-modal'
// import { Textarea } from '../textarea'
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
const noop = (_a?: unknown, _b?: unknown) => {
  /*errpor*/
}

export function MessageInput({
  onSubmit,
  // onPaste,
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
    editorAPI: editorApiRef,
    itemBackgroundColor: null,
    onBackgroundColorChange: noop,
    onColorChange: noop,
    onToggleMenu: noop,
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

    await onSubmit(input)

    setInput('')
    editorApiRef.current?.editor().commands.clearContent()
  })

  const isDisabled = !!disabled || isSubmitting

  return (
    <div className={clsx(styles.root, className)}>
      {user ? (
        <>
          <Avatar user={user} />
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
                  editorApiRef.current?.link('')
                  setAddLinkProps(undefined)
                }}
                onApply={(url: string) => {
                  editorApiRef.current?.link(url)
                  setAddLinkProps(undefined)
                }}
              />
            )}
            {startAdornment && <div className={styles.startAdornment}>{startAdornment}</div>}

            {isEditorReady && (
              <Toolbar className={styles.editorToolbar} isOpen={true} items={menuItems} />
            )}
            <div className={styles.messageInput}>
              <RichTextEditor
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
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void submitMessage()
                    }
                  },
                }}
              />
            </div>
            <div className={styles.buttons}>
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
