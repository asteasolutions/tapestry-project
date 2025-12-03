import { HelpPane } from 'tapestry-core-client/src/components/tapestry/help-pane'
import { DEFAULT_GUIDE } from 'tapestry-core-client/src/components/tapestry/help-pane/guide-pane'
import { DEFAULT_ACTIONS } from 'tapestry-core-client/src/components/tapestry/help-pane/shortcuts-pane'
import { SearchPane } from 'tapestry-core-client/src/components/tapestry/search/search-pane'
import { SidePane as BaseSidePane } from 'tapestry-core-client/src/components/tapestry/side-pane/index.js'
import { useTapestryData } from '../../app'

export function SidePane() {
  const displaySidePane = useTapestryData('displaySidePane')

  const isHelpPanel = displaySidePane === 'guide' || displaySidePane === 'shortcuts'
  const content = isHelpPanel ? (
    <HelpPane sidePaneType={displaySidePane} guide={DEFAULT_GUIDE} shortcuts={DEFAULT_ACTIONS} />
  ) : displaySidePane === 'search' ? (
    <SearchPane />
  ) : undefined

  return (
    <BaseSidePane isShown={!!displaySidePane} heading={isHelpPanel && 'Help'}>
      {content}
    </BaseSidePane>
  )
}
