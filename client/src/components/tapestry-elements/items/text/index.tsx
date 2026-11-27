import { defaults, omit } from 'lodash-es'
import { memo, RefObject, useEffect, useRef, useState } from 'react'
import { RichTextEditorApi } from 'tapestry-core-client/src/components/lib/rich-text-editor'
import { TextItemViewer } from 'tapestry-core-client/src/components/tapestry/items/text/viewer'
import { COLOR_PRESETS, TRANSPARENT } from 'tapestry-core-client/src/theme'
import { LiteralColor } from 'tapestry-core/src/lib/string'
import { TextItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryItemProps } from '..'
import { useDispatch, useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { updateItem } from '../../../../pages/tapestry/view-model/store-commands/items'
import { userSettings } from '../../../../services/user-settings'
import { useTapestryPath } from '../../../../hooks/use-tapestry-path'
import { buildToolbarMenu } from '../../item-toolbar'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { TapestryItem } from '../tapestry-item'
import { ToggleFormatButton, tooltip } from './toggle-format-button'
import { richTextEditorToolbar } from './toolbar'
import { useTextboxLink } from '../../../../hooks/use-textbox-link'
import { TEXT_ITEM_EXTENSIONS_MASK } from 'tapestry-shared/src/utils'
import { createSelectionState, SelectionState } from 'tapestry-core/src/tiptap'
import { AnnotationBubbleMenu, PENDING_ANNOTATION_DECORATION_KEY } from './annotation-bubble-menu'
import { useSession } from '../../../../layouts/session'
import {
  setPendingAnnotation,
  setSidePane,
} from '../../../../pages/tapestry/view-model/store-commands/tapestry'
import { EditorSidePaneType, TapestrySearchParams } from '../../../../pages/tapestry/view-model'
import { useNavigationState } from 'tapestry-core-client/src/components/tapestry/hooks/use-navigation-state'
import { ANNOTATION_EXTENSION_ID_ATTR } from 'tapestry-core/src/tiptap/annotation-extension'
import styles from './styles.module.css'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'

const BACKGROUND_COLORS: Record<LiteralColor, string> = COLOR_PRESETS

const FOCUSED_ANNOTATION_DECORATION_KEY = 'focused-annotation'

function useFocusedAnnotation(itemId: string, editorAPI: RefObject<RichTextEditorApi | undefined>) {
  const { locationState, params, setNavigationState } = useNavigationState<TapestrySearchParams>()
  const timestamp = locationState?.timestamp

  const { focus, annotationId } = params

  const isItemFocused = itemId === focus

  useEffect(() => {
    try {
      const editor = editorAPI.current?.editor()
      if (editor && annotationId && isItemFocused) {
        const annotationElements = editor.view.dom.querySelectorAll<HTMLElement>(
          `[${ANNOTATION_EXTENSION_ID_ATTR}="${annotationId}"]`,
        )

        if (annotationElements.length > 0) {
          const first = annotationElements[0]
          first.scrollIntoView({ block: 'nearest', behavior: 'smooth' })

          const last = annotationElements[annotationElements.length - 1]

          const from = editor.view.posAtDOM(first, 0)
          const to = editor.view.posAtDOM(last, last.childNodes.length)
          editor.commands.addDecorationToMap(FOCUSED_ANNOTATION_DECORATION_KEY, {
            from,
            to,
            props: { class: styles.focusedAnnotation },
          })
        }
      }
    } catch (e) {
      console.error(e)
    }
    return () => {
      // we need to alwayst get the most recent value of the api
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const editor = editorAPI.current?.editor()
      if (
        editor &&
        (editor.storage.decorationsMap.ranges[FOCUSED_ANNOTATION_DECORATION_KEY]?.length ?? 0) > 0
      ) {
        editor.commands.removeDecorationsFromMap(FOCUSED_ANNOTATION_DECORATION_KEY)
      }
    }
  }, [editorAPI, timestamp, annotationId, isItemFocused])

  return {
    focusAnnotation: (annotationId: string) => setNavigationState({ focus: itemId, annotationId }),
    unfocusAnnotation: async () => {
      if (params.annotationId) {
        await setNavigationState(omit(params, 'annotationId'), { state: locationState })
      }
    },
  }
}

function removeBlankLinesAtEnd(text: string) {
  return text.replace(/(?:<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>)+$/gi, '')
}
export const FOREGROUND_COLORS = omit(BACKGROUND_COLORS, TRANSPARENT)

export const TextItem = memo(({ id }: TapestryItemProps) => {
  const editorAPI = useRef<RichTextEditorApi>(undefined)
  const dto = useTapestryData(`items.${id}.dto`) as TextItemDto
  const {
    id: tapestryId,
    interactionMode,
    interactiveElement,
    pendingAnnotation,
    screenshotMode,
  } = useTapestryData([
    'id',
    'interactionMode',
    'interactiveElement',
    'pendingAnnotation',
    'screenshotMode',
  ])

  const { focusAnnotation, unfocusAnnotation } = useFocusedAnnotation(id, editorAPI)

  const hasPendingAnnotation =
    pendingAnnotation?.itemId === dto.id ? !!pendingAnnotation : undefined

  const { user } = useSession()

  const dispatch = useDispatch()
  const tapestryPath = useTapestryPath('view')

  const [selection, setSelection] = useState<SelectionState>()
  const [unsavedContent, setUnsavedContent] = useState<string | null>(null)

  const isEditMode = interactionMode === 'edit'
  const isInteractiveElement = id === interactiveElement?.modelId
  const isEditable = isEditMode && isInteractiveElement

  const {
    addLink,
    closeLinkModal,
    addingLink,
    ui: linkModalUi,
  } = useTextboxLink({
    editorAPI,
    tapestryId,
    tapestryPath,
    isEditable: isEditMode,
    onLinkApplied: () => editorAPI.current?.editor().chain().unsetColor().run(),
  })

  if (addingLink && !isEditable) {
    closeLinkModal()
  }

  const saveUnsavedContentRef = usePropRef(() => {
    if (unsavedContent !== null) {
      dispatch(updateItem(id, { dto: { text: removeBlankLinesAtEnd(unsavedContent) } }))
      setUnsavedContent(null)
    }
  })

  useEffect(() => {
    if (isEditable) {
      return
    }
    setShowFormatToolbar(false)

    saveUnsavedContentRef.current()
  }, [interactiveElement, isEditable, dispatch, id, saveUnsavedContentRef])

  const [showFormatToolbar, setShowFormatToolbar] = useState(false)

  const extensionsMask = defaults(
    {},
    omit(TEXT_ITEM_EXTENSIONS_MASK, 'annotation'),
    // removes the annotation from the mask
    screenshotMode ? {} : { annotation: TEXT_ITEM_EXTENSIONS_MASK.annotation },
  )

  const formattingControls = richTextEditorToolbar({
    editorAPI,
    selection,
    tapestryId,
    controls: extensionsMask,
    onLinkClick: () => {
      if (addingLink) {
        closeLinkModal()
      } else {
        closeSubmenu()
        addLink()
      }
    },
    addingLink,
    itemBackgroundColor: dto.backgroundColor,
    onBackgroundColorChange: (color, shouldClose) => {
      dispatch(updateItem(id, { dto: { backgroundColor: color } }))
      userSettings.updateTapestrySettings(tapestryId, { textItemColor: color })
      if (shouldClose) {
        closeSubmenu()
        editorAPI.current?.focus()
      }
    },
    onColorChange: (color, shouldClose) => {
      userSettings.updateTapestrySettings(tapestryId, { fontColor: color })
      editorAPI.current?.fgColor(color)
      if (shouldClose) {
        closeSubmenu()
      }
    },
    onToggleMenu: (id) => {
      closeLinkModal()
      selectSubmenu(id, true)
    },
  })

  const controls = buildToolbarMenu({ dto, isEdit: isEditMode, omit: { title: true } })

  const { selectSubmenu, toolbar, closeSubmenu } = useItemToolbar(id, {
    items: isEditMode
      ? [
          {
            element: (
              <ToggleFormatButton
                formatting={showFormatToolbar}
                onClick={() => setShowFormatToolbar(!showFormatToolbar)}
              />
            ),
            tooltip: tooltip(showFormatToolbar),
          },
          'separator',
          ...(showFormatToolbar ? formattingControls : controls),
        ]
      : controls,
  })

  return (
    <TapestryItem id={id} halo={toolbar}>
      <TextItemViewer
        id={id}
        api={editorAPI}
        // setting value to unsavedContent prevents re-rendering of the editor with old text before the model updates
        value={!isEditable && unsavedContent !== null ? unsavedContent : dto.text}
        placeholder={isEditable ? 'Add your text here...' : undefined}
        isEditable={isEditable}
        preventInternalLinkHandling={isEditMode}
        controls={extensionsMask}
        events={{
          onChange: (value) => {
            setUnsavedContent(value)
          },
          onCreate: (editor) => {
            if (isEditable) {
              if (editorAPI.current?.text().trim()) {
                editor
                  .chain()
                  .setTextSelection({ from: editor.$doc.from, to: editor.$doc.to })
                  .run()
              } else {
                const { fontColor, fontSize } = userSettings.getTapestrySettings(tapestryId)
                // The editor commands are always focusing the editor
                editor.chain().setColor(fontColor).setFontSize(fontSize).run()
              }
              setSelection(createSelectionState(editor))
              /* This is for the case when a user edits the text box -> creates pending annotation ->
                 the text gets saved and the editor gets recreated*/
              if (hasPendingAnnotation && pendingAnnotation) {
                editor.commands.addDecorationToMap(PENDING_ANNOTATION_DECORATION_KEY, {
                  from: pendingAnnotation.from,
                  to: pendingAnnotation.to,
                  props: { class: styles.pendingAnnotation },
                })
              }
            }
          },
          onSelectionChanged: (state) => {
            setSelection(state)
            closeLinkModal()
          },
          onClick: (e) => {
            const anchor = (e.target as HTMLElement).closest('a')
            if (!e.isDefaultPrevented() && anchor) {
              editorAPI.current?.editor().chain().extendMarkRange('link').run()
              // onSelectionChanged should be synchronous and called before addLink
              addLink()
            }

            if (hasPendingAnnotation) {
              dispatch(setPendingAnnotation(null))
            }

            const clickedAnnotationId = (e.target as HTMLElement)
              .closest(`[${ANNOTATION_EXTENSION_ID_ATTR}]`)
              ?.getAttribute(ANNOTATION_EXTENSION_ID_ATTR)
            if (clickedAnnotationId) {
              void focusAnnotation(clickedAnnotationId)
              dispatch(
                setSidePane({
                  type: EditorSidePaneType.ItemAnnotations,
                  data: { annotationId: clickedAnnotationId },
                }),
              )
            } else {
              void unfocusAnnotation()
            }
          },
          onCreateLink: () => {
            addLink()
            return true
          },
          onKeyDown: (e) => {
            if (e.code === 'Escape') {
              editorAPI.current?.editor().chain().blur().run()
            }
          },
        }}
      />
      {extensionsMask.annotation && user && (
        <AnnotationBubbleMenu
          editorAPI={editorAPI}
          itemId={id}
          onPendingAnnotation={() => saveUnsavedContentRef.current()}
        />
      )}
      {linkModalUi}
    </TapestryItem>
  )
})
