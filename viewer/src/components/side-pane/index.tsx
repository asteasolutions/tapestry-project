import { HelpPane } from 'tapestry-core-client/src/components/tapestry/help-pane'
import { DEFAULT_GUIDE } from 'tapestry-core-client/src/components/tapestry/help-pane/guide-pane'
import {
  CustomKeys,
  DEFAULT_ACTIONS,
} from 'tapestry-core-client/src/components/tapestry/help-pane/shortcuts-pane'
import { SearchPane } from 'tapestry-core-client/src/components/tapestry/search/search-pane'
import { SidePane as BaseSidePane } from 'tapestry-core-client/src/components/tapestry/side-pane/index.js'
import { useTapestryData } from '../../app'
import { deepFreeze } from 'tapestry-core/src/utils'
import { thru } from 'lodash'

const VIEWER_ACTIONS = deepFreeze(
  thru(structuredClone(DEFAULT_ACTIONS), (actions) => {
    const navigation = actions.find((s) => s.title === 'Navigation')
    navigation?.actions.push({ name: 'Navigate presentation', shortcut: CustomKeys.Presentation })
    return actions
  }),
)

export function SidePane() {
  const displaySidePane = useTapestryData('displaySidePane')

  const isHelpPanel = displaySidePane === 'guide' || displaySidePane === 'shortcuts'
  const content = isHelpPanel ? (
    <HelpPane sidePaneType={displaySidePane} guide={DEFAULT_GUIDE} shortcuts={VIEWER_ACTIONS} />
  ) : displaySidePane === 'search' ? (
    <SearchPane />
  ) : undefined

  return (
    <BaseSidePane isShown={!!displaySidePane} heading={isHelpPanel && 'Help'}>
      {content}
    </BaseSidePane>
  )
}
