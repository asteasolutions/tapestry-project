import { ReactNode, useState } from 'react'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import Gemini from '../../assets/icons/gemini.svg?react'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import { AIChat } from '../ai-chat'
import { CommentsPane } from '../comments-pane'
import { HelpPane } from 'tapestry-core-client/src/components/tapestry/help-pane'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import {
  hideEditControls,
  setSnackbar,
} from '../../pages/tapestry/view-model/store-commands/tapestry'
import { SidePane as BaseSidePane } from 'tapestry-core-client/src/components/tapestry/side-pane/index.js'
import { SearchPane } from 'tapestry-core-client/src/components/tapestry/search/search-pane/index.js'
import {
  DEFAULT_GUIDE,
  GuideSection,
} from 'tapestry-core-client/src/components/tapestry/help-pane/guide-pane'
import { thru } from 'lodash-es'
import {
  ActionsSection,
  CustomKeys,
  DEFAULT_ACTIONS,
} from 'tapestry-core-client/src/components/tapestry/help-pane/shortcuts-pane'
import { deepFreeze } from 'tapestry-core/src/utils'

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

const VIEWER_ACTIONS = deepFreeze(
  thru(structuredClone(DEFAULT_ACTIONS), (actions) => {
    const general = actions.find((s) => s.title === 'General shortcuts')
    general?.actions.push({ name: 'Switch between modes', shortcut: 'E' })
    return actions
  }),
)

const EDITOR_ACTIONS: ActionsSection[] = thru(structuredClone(VIEWER_ACTIONS), (actions) => {
  const general = actions.find((s) => s.title === 'General shortcuts')
  general?.actions.push(
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

// TODO: Try to make the key strongly typed
const headerText: Record<string, ReactNode> = {
  'general-comments': 'Comments',
  'inline-comments': 'Comments',
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

  const content =
    displaySidePane === 'inline-comments' || displaySidePane === 'general-comments' ? (
      <CommentsPane commentsPaneType={displaySidePane} />
    ) : displaySidePane === 'ai-chat' ? (
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
    ) : displaySidePane === 'guide' || displaySidePane === 'shortcuts' ? (
      <HelpPane
        sidePaneType={displaySidePane}
        guide={interactionMode === 'edit' ? EDITOR_GUIDE : DEFAULT_GUIDE}
        shortcuts={interactionMode === 'edit' ? EDITOR_ACTIONS : VIEWER_ACTIONS}
      />
    ) : displaySidePane === 'search' ? (
      <SearchPane />
    ) : undefined

  return (
    <BaseSidePane
      heading={displaySidePane && headerText[displaySidePane]}
      isMinimized={isMinimized}
      isShown={!!displaySidePane}
    >
      {content}
    </BaseSidePane>
  )
}
