import { Editor, EditorContent, FocusPosition, useEditor } from '@tiptap/react'
import clsx from 'clsx'
import { mapValues } from 'lodash-es'
import { MouseEventHandler, useRef } from 'react'
import {
  Controls,
  createSelectionState,
  getExtensions,
  getSelectionCommands,
  SelectionCommands,
  SelectionState,
} from 'tapestry-core/src/tiptap'
import { PropsWithStyle } from '..'
import styles from './styles.module.css'

export interface RichTextEditorApi extends SelectionCommands {
  editor: () => Editor
  text: () => string
  selectionText: () => string
  focus: (pos?: FocusPosition) => unknown
}

function getRichTextEditorApi(
  editor: Editor,
  onSelectionChanged?: (state: SelectionState) => unknown,
): RichTextEditorApi {
  return {
    ...mapValues(getSelectionCommands(editor), (command) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (...args: any[]) => {
        // @ts-expect-error command is of union type and typescript can not infer its argument type
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        command(...args)
        editor.chain().focus(null, { scrollIntoView: false }).run()
        onSelectionChanged?.(createSelectionState(editor))
      }
    }),
    editor: () => editor,
    text: () => editor.getText(),
    selectionText: () =>
      editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to),
    focus: (pos = null) => editor.chain().focus(pos, { scrollIntoView: false }).run(),
  }
}

export type RichTextEditorEvents<C extends Controls = Controls> = {
  onChange?: (value: string) => unknown
  onCreate?: (editor: Editor) => unknown
  onSelectionChanged?: (state: SelectionState) => unknown
  onClick?: MouseEventHandler<HTMLDivElement>
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => unknown
} & (C['link'] extends undefined ? unknown : { onCreateLink?: () => boolean })

export interface RichTextEditorProps<C extends Controls = Controls> extends PropsWithStyle {
  value: string
  isEditable: boolean
  api?: React.RefObject<RichTextEditorApi | undefined>
  placeholder?: string
  events?: RichTextEditorEvents<C>
  controls?: C
}

export function RichTextEditor({
  value,
  isEditable,
  style,
  api,
  placeholder,
  events,
  className,
  controls,
}: RichTextEditorProps) {
  const eventsRef = useRef(events)
  eventsRef.current = events
  const editor = useEditor(
    {
      extensions: getExtensions({
        placeholder,
        onCreateLink: () => eventsRef.current?.onCreateLink?.() ?? true,
        controls,
      }),
      content: value,
      editable: isEditable,
      parseOptions: {
        preserveWhitespace: true,
      },
      onSelectionUpdate: ({ editor }) => {
        eventsRef.current?.onSelectionChanged?.(createSelectionState(editor))
      },
      onCreate: ({ editor }) => {
        eventsRef.current?.onCreate?.(editor)
      },
      onUpdate: ({ editor }) => {
        eventsRef.current?.onChange?.(editor.getHTML())
      },
      onDestroy: () => {
        if (api) {
          api.current = undefined
        }
      },
    },
    [isEditable, value],
  )

  if (api) {
    api.current = editor.isDestroyed
      ? undefined
      : getRichTextEditorApi(editor, eventsRef.current?.onSelectionChanged)
  }

  return (
    <div style={style} className={clsx(styles.root, className)}>
      <EditorContent
        editor={editor}
        className="content"
        onKeyDown={(e) => {
          events?.onKeyDown?.(e)
          e.stopPropagation()
        }}
        onPaste={(e) => e.stopPropagation()}
        onCopy={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={eventsRef.current?.onClick}
      />
    </div>
  )
}
