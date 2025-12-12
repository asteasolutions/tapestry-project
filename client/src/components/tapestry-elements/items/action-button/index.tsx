import { memo, useEffect, useRef, useState } from 'react'
import {
  Controls,
  createSelectionState,
  RichTextEditorApi,
  SelectionState,
} from 'tapestry-core-client/src/components/lib/rich-text-editor'
import { ActionButtonItemViewer } from 'tapestry-core-client/src/components/tapestry/items/action-button/viewer'
import { LiteralColor } from 'tapestry-core-client/src/theme/types'
import { ActionButtonItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryItemProps } from '..'
import { useDispatch, useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { updateItem } from '../../../../pages/tapestry/view-model/store-commands/items'
import { userSettings } from '../../../../services/user-settings'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { TapestryItem } from '../tapestry-item'
import { ToggleFormatButton, tooltip } from '../text/toggle-format-button'
import { textItemToolbar } from '../text/toolbar'
import { AssignAction } from './assign-action'
import { buildToolbarMenu } from '../../item-toolbar'

const controls = {
  link: false,
  justification: false,
  list: false,
} satisfies Controls

export const ActionButtonItem = memo(({ id }: TapestryItemProps) => {
  const editorAPI = useRef<RichTextEditorApi>(undefined)
  const dto = useTapestryData(`items.${id}.dto`) as ActionButtonItemDto
  const {
    id: tapestryId,
    interactionMode,
    interactiveElement,
  } = useTapestryData(['id', 'interactionMode', 'interactiveElement'])
  const dispatch = useDispatch()

  const [selection, setSelection] = useState<SelectionState>()
  const [unsavedContent, setUnsavedContent] = useState<string | null>(null)

  const isEditMode = interactionMode === 'edit'
  const isInteractiveElement = id === interactiveElement?.modelId
  const isEditable = isEditMode && isInteractiveElement

  useEffect(() => {
    if (isEditable) {
      return
    }

    setShowFormatToolbar(false)

    if (unsavedContent !== null) {
      dispatch(updateItem(id, { dto: { text: unsavedContent } }))
      setUnsavedContent(null)
    }
  }, [isEditable, dispatch, id, unsavedContent])

  const [showFormatToolbar, setShowFormatToolbar] = useState(false)

  const formattingControls = textItemToolbar({
    editorAPI,
    controls,
    selection,
    tapestryId,
    itemBackgroundColor: dto.backgroundColor,
    onBackgroundColorChange: (color: LiteralColor) => {
      dispatch(updateItem(id, { dto: { backgroundColor: color } }))
      userSettings.updateTapestrySettings(tapestryId, { textItemColor: color })
      closeSubmenu()
      editorAPI.current?.focus()
    },
    onColorChange: (color) => {
      userSettings.updateTapestrySettings(tapestryId, { fontColor: color })
      editorAPI.current?.fgColor(color)
      closeSubmenu()
    },
    onToggleMenu: (id) => {
      selectSubmenu(id, true)
    },
  })

  const editorControls = buildToolbarMenu({ dto, isEdit: true, omit: { title: true } })

  const { selectSubmenu, toolbar, closeSubmenu } = useItemToolbar(
    id,
    {
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
            {
              element: <AssignAction dto={dto} />,
              tooltip: { side: 'bottom', children: 'Assign action' },
            },
            'separator',
            ...(showFormatToolbar ? formattingControls : editorControls),
          ]
        : [],
    },
    !isEditMode,
  )

  return (
    <TapestryItem id={id} halo={toolbar}>
      <ActionButtonItemViewer
        id={id}
        api={editorAPI}
        controls={controls}
        // setting value to unsavedContent prevents re-rendering of the editor with old text before the model updates
        value={!isEditable && unsavedContent !== null ? unsavedContent : dto.text}
        placeholder="Add your text here..."
        isEditable={isEditable}
        events={{
          onChange: (value) => {
            setUnsavedContent(value)
          },
          onCreate: (editor) => {
            if (!isEditable) {
              return
            }

            if (editorAPI.current?.text().trim()) {
              editor.chain().setTextSelection({ from: editor.$doc.from, to: editor.$doc.to }).run()
            } else {
              const { fontColor, fontSize } = userSettings.getTapestrySettings(tapestryId)
              // The editor commands are always focusing the editor
              editor.chain().setColor(fontColor).setFontSize(fontSize).run()
            }
            setSelection(createSelectionState(editor))
          },
          onSelectionChanged: setSelection,
          onKeyDown: (e) => {
            if (e.code === 'Escape') {
              editorAPI.current?.editor().chain().blur().run()
            }
          },
        }}
      />
    </TapestryItem>
  )
})
