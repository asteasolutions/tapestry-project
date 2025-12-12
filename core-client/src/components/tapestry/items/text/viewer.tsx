import clsx from 'clsx'
import { RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { useFocusElement } from 'tapestry-core-client/src/components/tapestry/hooks/use-focus-element'
import { iterateParents, matchHighlight, MatchRanges } from 'tapestry-core-client/src/lib/dom'
import { TRANSPARENT } from 'tapestry-core-client/src/theme'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { IdMap } from 'tapestry-core/src/utils'
import { TextItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { useTapestryConfig } from '../..'
import { GroupViewModel, ItemViewModel } from '../../../../view-model'
import {
  RichTextEditor,
  RichTextEditorApi,
  RichTextEditorProps,
  SelectionState,
} from '../../../lib/rich-text-editor'
import styles from './styles.module.css'

export function elementIdFromLink(
  link: string,
  items: IdMap<ItemViewModel>,
  groups: IdMap<GroupViewModel>,
) {
  const url = new URL(link)
  const elementId = url.searchParams.get('focus')
  const element = elementId && (items[elementId] ?? groups[elementId])
  const currentTapestryPath = `${location.origin}${location.pathname}`.replace(/(\/edit)?$/, '')
  return link.startsWith(currentTapestryPath) && !!element ? elementId : null
}

function useHasScroll(editorRef: RefObject<RichTextEditorApi | undefined>) {
  const [hasScroll, setHasScroll] = useState(compute)
  function compute() {
    const editor = editorRef.current
    if (!editor) {
      return false
    }
    return editor.editor().view.dom.scrollHeight > editor.editor().view.dom.clientHeight
  }
  return { hasScroll, check: () => setHasScroll(compute()) }
}

export interface TextItemViewerProps extends Partial<RichTextEditorProps> {
  id: Id
  preventInternalLinkHandling?: boolean
}

export function TextItemViewer({
  id,
  events,
  style,
  className,
  preventInternalLinkHandling,
  api,
  ...rteProps
}: TextItemViewerProps) {
  const editorAPI = useRef<RichTextEditorApi>(undefined)

  // We want to have a local ref to the editor API, but also pass it to the `api` property.
  // Not sure if this is the best solution.
  useImperativeHandle(api, () => editorAPI.current)

  const { useStoreData } = useTapestryConfig()
  const dto = useStoreData(`items.${id}.dto`) as TextItemDto
  const { interactiveElement, items, groups, searchTerm } = useStoreData([
    'interactiveElement',
    'items',
    'groups',
    'searchTerm',
  ])

  const focusElement = useFocusElement()

  const [selection, setSelection] = useState<SelectionState>()
  const [currentSearchTerm, setCurrentSearchTerm] = useState<string | null>()
  const matchRanges = useRef<MatchRanges>(undefined)

  const isInteractiveElement = id === interactiveElement?.modelId

  const backgroundColor = dto.backgroundColor ?? TRANSPARENT

  const [wasInteractiveElement, setWasInteractiveElement] = useState(isInteractiveElement)

  if (searchTerm !== currentSearchTerm) {
    setCurrentSearchTerm(searchTerm)
    matchRanges.current?.removeFromHighlight(matchHighlight)
    if (searchTerm) {
      const editor = editorAPI.current?.editor().view.dom
      if (editor) {
        matchRanges.current = new MatchRanges(editor, searchTerm)
        matchRanges.current.addToHighlight(matchHighlight)
        if (isInteractiveElement) {
          matchRanges.current.scrollFirstRangeIntoView()
        }
      }
    } else {
      matchRanges.current = undefined
    }
  }

  useEffect(() => {
    if (wasInteractiveElement !== isInteractiveElement) {
      setWasInteractiveElement(isInteractiveElement)
      if (isInteractiveElement) {
        matchRanges.current?.scrollFirstRangeIntoView()
      }
    }
  }, [isInteractiveElement, wasInteractiveElement])

  const { hasScroll, check } = useHasScroll(editorAPI)

  // TODO: Updating tiptap will allow us to render a router Link in the editor
  // instead of manually handling link clicks
  function tryNavigatingToElement({ href }: HTMLAnchorElement) {
    const id = elementIdFromLink(href, items, groups)
    if (id) {
      focusElement(id, Object.fromEntries(new URL(href).searchParams))
      return true
    }
    return false
  }

  return (
    <>
      <RichTextEditor
        api={editorAPI}
        // setting value to unsavedContent prevents re-rendering of the editor with old text before the model updates
        value={dto.text}
        isEditable={false}
        style={{ backgroundColor, ...style }}
        className={clsx(styles.editor, className, {
          [styles.interactive]: isInteractiveElement,
        })}
        events={{
          onChange: (value) => {
            matchRanges.current?.removeFromHighlight(matchHighlight)
            events?.onChange?.(value)
          },
          onCreate: (editor) => {
            // In some cases when activating a text item the editor gets rerendered,
            // so we rerender the component with searchTerm null in order to reconstruct the match ranges.
            if (searchTerm) {
              setCurrentSearchTerm(null)
            }
            events?.onCreate?.(editor)
            check()
          },
          onSelectionChanged: (state) => {
            setSelection(state)
            events?.onSelectionChanged?.(state)
          },
          onClick: (e) => {
            const maybeAnchor = iterateParents(e.target as HTMLElement, (e) => e.tagName !== 'A')
            if (
              maybeAnchor &&
              !selection?.text &&
              !preventInternalLinkHandling &&
              tryNavigatingToElement(maybeAnchor as HTMLAnchorElement)
            ) {
              e.preventDefault()
              return
            }
            events?.onClick?.(e)
          },
          onCreateLink: events?.onCreateLink,
          onKeyDown: events?.onKeyDown,
        }}
        {...rteProps}
      />
      {!isInteractiveElement && hasScroll && (
        <Icon icon="unfold_more" className={styles.scrollIndicator} />
      )}
    </>
  )
}
