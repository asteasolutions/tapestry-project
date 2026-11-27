import { useTapestryConfig } from '..'
import { Icon } from '../../../../src/components/lib/icon/index'
import { TabPanel } from '../../../../src/components/lib/tab-panel/index'
import { SidePaneType } from '../../../view-model'
import { setSidePane } from '../../../view-model/store-commands/tapestry'
import { GuidePane, GuideSection } from './guide-pane'
import { ActionsSection, ShortcutsPane } from './shortcuts-pane'
import styles from './styles.module.css'

interface HelpPaneProps {
  sidePaneType: string
  shortcuts: ActionsSection[]
  guide: GuideSection[]
}

export function HelpPane({ sidePaneType, shortcuts, guide }: HelpPaneProps) {
  const { useDispatch } = useTapestryConfig()
  const dispatch = useDispatch()

  return (
    <div className={styles.root}>
      <TabPanel
        tabs={{
          shortcuts: (
            <>
              <Icon icon="keyboard" />
              Keyboard shortcuts
            </>
          ),
          guide: (
            <>
              <Icon icon="menu_book" />
              Getting started guide
            </>
          ),
        }}
        selected={sidePaneType}
        onSelect={(tabId) => {
          dispatch(setSidePane(tabId))
        }}
        className={styles.tabPanel}
      />
      {sidePaneType === String(SidePaneType.Shortcuts) && <ShortcutsPane actions={shortcuts} />}
      {sidePaneType === String(SidePaneType.Guide) && <GuidePane guide={guide} />}
    </div>
  )
}
