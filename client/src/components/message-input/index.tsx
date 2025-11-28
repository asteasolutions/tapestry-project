import { useSession } from '../../layouts/session'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { Avatar } from '../avatar'
import styles from './styles.module.css'
import { ReactNode, useState } from 'react'
import { JoinTapestriesModal } from '../join-tapestries-modal'
import { Textarea } from '../textarea'
import clsx from 'clsx'

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

export function MessageInput({
  onSubmit,
  onPaste,
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

  const { perform: submitMessage, loading: isSubmitting } = useAsyncAction(async () => {
    const text = input.trim()
    if (!text) return

    await onSubmit(text)

    setInput('')
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
            {startAdornment && <div className={styles.startAdornment}>{startAdornment}</div>}
            <Textarea
              rows={1}
              className={styles.messageInput}
              placeholder={placeholder ?? 'Add comment'}
              value={input}
              disabled={isDisabled}
              onChange={(e) => setInput(e.target.value)}
              onSubmit={() => submitMessage()}
              onPasteCapture={(event) => {
                const processedData = onPaste?.(event.clipboardData)
                if (processedData) {
                  event.stopPropagation()
                  event.preventDefault()

                  const textarea = event.currentTarget
                  const [start, end] = [textarea.selectionStart, textarea.selectionEnd]
                  textarea.setRangeText(processedData, start, end, 'end')
                  setInput(textarea.value)
                }
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
