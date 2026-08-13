import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { useState } from 'react'
import { Button, IconButton } from '../buttons/index'
import { Input } from '../input/index'
import styles from './comment-bubble-menu.module.css'
import { getSelectionText } from '.'
import { truncate } from 'lodash'

export interface CommentBubbleMenuProps {
  editor: Editor
}

export function CommentBubbleMenu({ editor }: CommentBubbleMenuProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [note, setNote] = useState('')

  function close() {
    setIsAdding(false)
    setNote('')
  }

  return (
    <BubbleMenu
      editor={editor}
      className={styles.root}
      data-captures-pointer-events
      appendTo={editor.$doc.element.closest<HTMLElement>('.tapestry-component') ?? undefined}
      style={{ transform: 'scale(calc(1 / var(--scale)))' }}
      options={{
        placement: 'right-end',
        offset: { crossAxis: 10, mainAxis: -5 },
        onHide: () => {
          setIsAdding(false)
          setNote('')
        },
      }}
    >
      {isAdding ? (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            if (note.trim()) {
              editor.chain().focus().setComment(note.trim()).run()
            }
            close()
          }}
        >
          <Input
            autoFocus
            placeholder={`”${truncate(getSelectionText(editor), { length: 20 })}”`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                close()
              }
            }}
          />
          <Button variant="primary" size="small" disabled={!note.trim()}>
            Save
          </Button>
          <IconButton icon="close" aria-label="Cancel comment" onClick={close} />
        </form>
      ) : (
        <IconButton
          icon="format_ink_highlighter"
          aria-label="Annotate selection"
          onClick={() => setIsAdding(true)}
          tooltip={{ children: 'Annotate selection', side: 'bottom' }}
        />
      )}
    </BubbleMenu>
  )
}
