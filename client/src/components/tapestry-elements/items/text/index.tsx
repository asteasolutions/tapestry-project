import { kebabCase, omit } from 'lodash-es'
import { memo, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createSelectionState,
  RichTextEditorApi,
  SelectionState,
} from 'tapestry-core-client/src/components/lib/rich-text-editor'
import { TextItemViewer } from 'tapestry-core-client/src/components/tapestry/items/text/viewer'
import { iterateParents } from 'tapestry-core-client/src/lib/dom'
import { DOM_MODEL_ID_DATA_ATTR } from 'tapestry-core-client/src/stage/utils'
import { COLOR_PRESETS, TRANSPARENT } from 'tapestry-core-client/src/theme'
import { LiteralColor } from 'tapestry-core-client/src/theme/types'
import { TextItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryItemProps } from '..'
import { useDispatch, useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { updateItem } from '../../../../pages/tapestry/view-model/store-commands/items'
import { userSettings } from '../../../../services/user-settings'
import { buildArchiveOracleQueryFromHtml } from '../../../archive-oracle/query'
import { archiveOracleSearch } from '../../../archive-oracle/search'
import { buildToolbarMenu } from '../../item-toolbar'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { TapestryItem } from '../tapestry-item'
import { LinkTooltip, LinkTooltipProps } from './link-tooltip'
import { ToggleFormatButton, tooltip } from './toggle-format-button'
import { textItemToolbar } from './toolbar'
import {
  clearArchiveOracleGhosts,
  updateArchiveOracle,
  setArchiveOracleGhosts,
} from '../../../../pages/tapestry/view-model/store-commands/archive-oracle'

const BACKGROUND_COLORS: Record<LiteralColor, string> = COLOR_PRESETS

export const FOREGROUND_COLORS = omit(BACKGROUND_COLORS, TRANSPARENT)

export const TextItem = memo(({ id }: TapestryItemProps) => {
  const editorAPI = useRef<RichTextEditorApi>(undefined)
  const dto = useTapestryData(`items.${id}.dto`) as TextItemDto
  const {
    id: tapestryId,
    interactionMode,
    interactiveElement,
  } = useTapestryData(['id', 'interactionMode', 'interactiveElement'])
  const dispatch = useDispatch()

  const [addLinkProps, setAddLinkProps] = useState<Pick<LinkTooltipProps, 'element' | 'content'>>()
  const [selection, setSelection] = useState<SelectionState>()
  const [unsavedContent, setUnsavedContent] = useState<string | null>(null)

  const isEditMode = interactionMode === 'edit'
  const isInteractiveElement = id === interactiveElement?.modelId
  const isEditable = isEditMode && isInteractiveElement
  const archiveOracleEnabled = useTapestryData('archiveOracle.enabled')

  useEffect(() => {
    if (isEditable) {
      return
    }
    setShowFormatToolbar(false)
    setAddLinkProps(undefined)

    if (unsavedContent !== null) {
      dispatch(updateItem(id, { dto: { text: unsavedContent } }))
      setUnsavedContent(null)
    }
  }, [isEditable, dispatch, id, unsavedContent])

  useEffect(() => {
    if (!isEditable || !archiveOracleEnabled) {
      dispatch(clearArchiveOracleGhosts(), updateArchiveOracle({ sourceItemId: null, query: '' }))
      return
    }

    const controller = new AbortController()
    const html = unsavedContent ?? dto.text
    const { query, plainText } = buildArchiveOracleQueryFromHtml(html)

    if (!query) {
      dispatch(clearArchiveOracleGhosts(), updateArchiveOracle({ sourceItemId: id, query: '' }))
      return
    }

    const timeout = window.setTimeout(() => {
      dispatch(
        updateArchiveOracle({
          sourceItemId: id,
          query: plainText,
          loading: true,
          error: undefined,
        }),
      )
      void (async () => {
        try {
          const docs = await archiveOracleSearch(query, controller.signal)

          const baseX = dto.position.x + dto.size.width + 40
          const baseY = dto.position.y
          const rowH = 140
          const positions = docs.map((_, idx) => ({ x: baseX, y: baseY + idx * rowH }))

          dispatch(setArchiveOracleGhosts(id, plainText, docs, positions))
        } catch (e) {
          if (controller.signal.aborted) return
          dispatch(
            updateArchiveOracle({
              loading: false,
              error: e instanceof Error ? e.message : 'Archive Oracle search failed',
            }),
          )
        }
      })()
    }, 650)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [
    archiveOracleEnabled,
    dispatch,
    dto.position.x,
    dto.position.y,
    dto.size.width,
    dto.text,
    id,
    isEditable,
    unsavedContent,
  ])

  const addLink = (domNode?: HTMLElement) => {
    const editor = editorAPI.current?.editor()
    if (addLinkProps || !editor || !isEditMode) {
      return
    }

    const selectionStartDOMNode = editor.view.domAtPos(editor.state.selection.from).node

    const anchorElement =
      selectionStartDOMNode instanceof HTMLElement
        ? selectionStartDOMNode
        : selectionStartDOMNode.parentElement

    if (!anchorElement) {
      return
    }
    setAddLinkProps({
      content: editorAPI.current?.selectionText(),
      element: domNode ?? anchorElement,
    })
  }

  const [showFormatToolbar, setShowFormatToolbar] = useState(false)

  const formattingControls = textItemToolbar({
    editorAPI,
    selection,
    tapestryId,
    onLinkClick: () => {
      if (addLinkProps) {
        setAddLinkProps(undefined)
      } else {
        closeSubmenu()
        addLink()
      }
    },
    canAddLink: !!addLinkProps,
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
      setAddLinkProps(undefined)
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
            }
          },
          onSelectionChanged: (state) => {
            setSelection(state)
            setAddLinkProps(undefined)
          },
          onClick: (e) => {
            const maybeAnchor = iterateParents(e.target as HTMLElement, (e) => e.tagName !== 'A')
            if (!e.isDefaultPrevented() && maybeAnchor && !selection?.text) {
              editorAPI.current?.editor().chain().extendMarkRange('link').run()
              // onSelectionChanged should be synchronous and called before addLink
              addLink(maybeAnchor)
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
      {addLinkProps &&
        createPortal(
          <LinkTooltip
            {...addLinkProps}
            onRemove={() => {
              editorAPI.current?.editor().commands.unsetLink()
              setAddLinkProps(undefined)
            }}
            onApply={(href, text) => {
              if (!editorAPI.current) {
                return
              }

              const editor = editorAPI.current.editor()

              if (text) {
                editor.chain().insertContent(text).run()

                const selection = editor.state.selection

                editor
                  .chain()
                  .setTextSelection({ from: selection.to - text.length, to: selection.to })
                  .run()
              }

              editor.chain().setLink({ href }).unsetColor().run()

              setAddLinkProps(undefined)
            }}
          />,
          document.querySelector(`[data-${kebabCase(DOM_MODEL_ID_DATA_ATTR)}="${id}"]`)!,
        )}
    </TapestryItem>
  )
})
