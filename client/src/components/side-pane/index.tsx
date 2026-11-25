import { ReactNode, useEffect, useRef, useState } from 'react'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import Gemini from '../../assets/icons/gemini.svg?react'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import { AIChat } from '../ai-chat'
import { ItemCommentsPane } from '../item-comments-pane'
import { HelpPane } from 'tapestry-core-client/src/components/tapestry/help-pane'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import {
  hideEditControls,
  setPendingAnnotation,
  setSidePane,
  setSnackbar,
} from '../../pages/tapestry/view-model/store-commands/tapestry'
import { SidePane as BaseSidePane } from 'tapestry-core-client/src/components/tapestry/side-pane/index.js'
import { SearchPane } from 'tapestry-core-client/src/components/tapestry/search/search-pane/index.js'
import {
  DEFAULT_GUIDE,
  GuideSection,
} from 'tapestry-core-client/src/components/tapestry/help-pane/guide-pane'
import { omit, thru } from 'lodash-es'
import {
  Action,
  ActionsSection,
  CustomKeys,
  DEFAULT_ACTIONS,
} from 'tapestry-core-client/src/components/tapestry/help-pane/shortcuts-pane'
import { deepFreeze } from 'tapestry-core/src/utils'
import { EditorSidePaneType, TapestrySearchParams } from '../../pages/tapestry/view-model'
import { DiscussionPane } from '../discussion-pane'
import { RelCommentsPane } from '../rel-comments-pane'
import { useNavigationState } from 'tapestry-core-client/src/components/tapestry/hooks/use-navigation-state'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'

const EDITOR_GUIDE: GuideSection[] = [
  {
    title: 'Add text and files',
    tips: [
      { icon: 'image', text: 'Drag and drop media and files from your computer' },
      { icon: 'file_copy', text: 'Paste links and files on the canvas ' },
      { icon: 'view_sidebar', text: 'Click to add files or text from the sidebar' },
    ],
  },
  ...thru(structuredClone(DEFAULT_GUIDE), (defaultGuide) => {
    const nav = defaultGuide.find((s) => s.title === 'Navigate')
    nav?.tipGroups?.[0].tips.push({ icon: 'pan_tool', text: 'Click and drag  to move objects' })
    return defaultGuide
  }),
]

const commonActions: Record<string, Action[]> = {
  'General shortcuts': [{ name: 'Switch between modes', shortcut: 'E' }],
}

const VIEWER_ACTIONS = deepFreeze(
  thru(structuredClone(DEFAULT_ACTIONS), (actions) => {
    const general = actions.find((s) => s.title === 'General shortcuts')
    general?.actions.push(...commonActions[general.title])

    const navigation = actions.find((s) => s.title === 'Navigation')
    navigation?.actions.push({ name: 'Navigate presentation', shortcut: CustomKeys.Presentation })
    return actions
  }),
)

const EDITOR_ACTIONS: ActionsSection[] = thru(structuredClone(DEFAULT_ACTIONS), (actions) => {
  const general = actions.find((s) => s.title === 'General shortcuts')
  general?.actions.push(
    ...commonActions[general.title],
    { name: 'Undo', shortcut: 'meta + Z' },
    { name: 'Redo', shortcut: 'meta + shift + Z | meta + Y' },
    { name: 'Add text', shortcut: 'T' },
    { name: 'Import files', shortcut: 'I' },
    { name: 'Import from link', shortcut: 'meta + K' },
    { name: 'Set viewport', shortcut: 'meta + shift + S' },
  )

  const items = actions.find((s) => s.title === 'Item shortcuts')
  items?.actions.push(
    { name: 'Delete item(s)', shortcut: 'Delete | Backspace' },
    { name: 'Move item(s)', shortcut: CustomKeys.Arrows },
    { name: 'Make a copy of item(s)', shortcut: 'meta + D' },
    { name: 'Change thumbnail', shortcut: 'meta + alt + T' },
    { name: 'Copy item(s)', shortcut: 'meta + C' },
    { name: 'Paste item(s)', shortcut: 'meta + V' },
    { name: 'Drag item(s) precisely', shortcut: CustomKeys.Meta },
    { name: 'Resize item(s) precisely', shortcut: CustomKeys.Meta },
    { name: 'Resize item(s) proportionally', shortcut: 'Shift' },
    { name: 'Copy size', shortcut: 'meta + alt + C' },
    { name: 'Paste size', shortcut: 'meta + alt + V' },
    { name: "Show item's info", shortcut: 'meta + I' },
  )

  actions.push({
    title: 'Text editor',
    actions: [
      { name: 'Toggle formatting', shortcut: 'alt + F' },
      { name: 'Bold', shortcut: 'meta + B' },
      { name: 'Italic', shortcut: 'meta + I' },
      { name: 'Underline', shortcut: 'meta + U' },
      { name: 'Strikethrough', shortcut: 'meta + shift + S' },
      { name: 'Align right', shortcut: 'meta + shift + R' },
      { name: 'Align left', shortcut: 'meta + shift + L' },
      { name: 'Align center', shortcut: 'meta + shift + E' },
      { name: 'Align justified', shortcut: 'meta + shift + J' },
      { name: 'Bullet list', shortcut: 'meta + shift + 8' },
      { name: 'Numbered list', shortcut: 'meta + shift + 7' },
    ],
  })

  return actions
})

function useSidePaneControl(sidePaneType: EditorSidePaneType | null) {
  const { interactiveElement, pendingAnnotation } = useTapestryData([
    'interactiveElement',
    'pendingAnnotation',
  ])

  const dispatch = useDispatch()

  // annotation search param controls
  const navigationControls = useNavigationState<TapestrySearchParams>()
  const navigationControlsRef = usePropRef(navigationControls)

  const params = navigationControls.params
  const timestamp = navigationControls.locationState?.timestamp
  const oldTimestampRef = useRef(timestamp)

  useEffect(() => {
    const isOwnItemAnnotationPaneOpen =
      sidePaneType === EditorSidePaneType.ItemAnnotations &&
      params.focus &&
      params.focus === interactiveElement?.modelId

    if (params.annotationId && !isOwnItemAnnotationPaneOpen) {
      if (timestamp && oldTimestampRef.current === timestamp) {
        void navigationControlsRef.current.setNavigationState(omit(params, 'annotationId'), {
          state: navigationControlsRef.current.locationState,
        })
      } else {
        dispatch(
          setSidePane({
            type: EditorSidePaneType.ItemAnnotations,
            data: { annotationId: params.annotationId },
          }),
        )
      }
    }
    oldTimestampRef.current = timestamp
  }, [
    sidePaneType,
    interactiveElement,
    timestamp,
    params,
    oldTimestampRef,
    navigationControlsRef,
    dispatch,
  ])

  useEffect(() => {
    const isItemCommentsPane =
      sidePaneType === EditorSidePaneType.ItemComments ||
      sidePaneType === EditorSidePaneType.ItemAnnotations
    if (
      (interactiveElement?.modelType !== 'item' && isItemCommentsPane) ||
      (interactiveElement?.modelType !== 'rel' && sidePaneType === EditorSidePaneType.RelComments)
    ) {
      dispatch(setSidePane(null))
    }
    if (
      pendingAnnotation &&
      (pendingAnnotation.itemId !== interactiveElement?.modelId || !isItemCommentsPane)
    ) {
      dispatch(setPendingAnnotation(null))
    }
  }, [sidePaneType, pendingAnnotation, interactiveElement, dispatch])
}

const headerText: Partial<Record<EditorSidePaneType, ReactNode>> = {
  discussion: 'Discussion',
  'item-comments': 'Comments',
  'rel-comments': 'Comments',
  'item-annotations': 'Comments',
  shortcuts: 'Help',
  guide: 'Help',
  'ai-chat': (
    <div style={{ display: 'flex', gap: '5px' }}>
      <SvgIcon Icon={Gemini} size={24} />
      <Text>Gemini</Text>
    </div>
  ),
}

export function SidePane() {
  const {
    id: tapestryId,
    displaySidePane,
    interactionMode,
  } = useTapestryData(['id', 'displaySidePane', 'interactionMode'])
  const [isMinimized, setIsMinimized] = useState(false)
  const dispatch = useDispatch()

  const type = displaySidePane?.type

  useSidePaneControl(type ?? null)

  const content =
    type === EditorSidePaneType.ItemComments || type === EditorSidePaneType.ItemAnnotations ? (
      <ItemCommentsPane
        commentsPaneType={type}
        annotationId={
          displaySidePane?.type === EditorSidePaneType.ItemAnnotations
            ? displaySidePane.data?.annotationId
            : undefined
        }
      />
    ) : type === EditorSidePaneType.RelComments ? (
      <RelCommentsPane />
    ) : type === EditorSidePaneType.Discussion ? (
      <DiscussionPane />
    ) : type === EditorSidePaneType.AIChat ? (
      <AIChat
        tapestryId={tapestryId}
        canAttachItems
        onPickingItems={(isPicking, count) => {
          setIsMinimized(isPicking)
          dispatch(
            isPicking && setSnackbar('Select the items to attach and click Done'),
            count !== undefined && setSnackbar(`${count} item(s) have been attached`),
            hideEditControls(isPicking),
          )
        }}
      />
    ) : type === EditorSidePaneType.Guide || type === EditorSidePaneType.Shortcuts ? (
      <HelpPane
        sidePaneType={type}
        guide={interactionMode === 'edit' ? EDITOR_GUIDE : DEFAULT_GUIDE}
        shortcuts={interactionMode === 'edit' ? EDITOR_ACTIONS : VIEWER_ACTIONS}
      />
    ) : type === EditorSidePaneType.Search ? (
      <SearchPane />
    ) : undefined

  return (
    <BaseSidePane
      heading={type && headerText[type]}
      isMinimized={isMinimized}
      isShown={!!displaySidePane}
    >
      {content}
    </BaseSidePane>
  )
}
