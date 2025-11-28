import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { CommentsList } from '../comments-list'
import { TabPanel } from 'tapestry-core-client/src/components/lib/tab-panel/index'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { setSidePane } from '../../pages/tapestry/view-model/store-commands/tapestry'

export interface CommentsPaneProps {
  commentsPaneType: 'inline-comments' | 'general-comments'
}

export function CommentsPane({ commentsPaneType }: CommentsPaneProps) {
  const {
    id: tapestryId,
    interactiveElement,
    commentThread,
  } = useTapestryData(['id', 'interactiveElement', 'commentThread'])
  const interactiveItem = useTapestryData(`items.${interactiveElement?.modelId ?? 'no-id'}`)
  const interactiveRel = useTapestryData(`rels.${interactiveElement?.modelId ?? 'no-id'}`)
  const dispatch = useDispatch()

  const contextType =
    commentsPaneType === 'inline-comments' ? interactiveElement?.modelType : 'tapestry'
  const contextId =
    commentsPaneType === 'inline-comments' ? interactiveElement?.modelId : tapestryId

  const inlineContext = interactiveItem ?? interactiveRel

  const inlineComments = inlineContext?.commentThread?.size
  const generalComments = commentThread?.size

  return (
    <div className={styles.root}>
      <TabPanel
        tabs={{
          'inline-comments': `Inline${Number.isFinite(inlineComments) ? ` (${inlineComments})` : ''}`,
          'general-comments': `General${Number.isFinite(generalComments) ? ` (${generalComments})` : ''}`,
        }}
        selected={commentsPaneType}
        onSelect={(tabId) => {
          dispatch(setSidePane(tabId))
        }}
      />
      {contextType && contextId ? (
        <CommentsList contextType={contextType} contextId={contextId} />
      ) : (
        <div className={styles.emptyPlaceholder}>
          <Text component="p" variant="bodySm">
            Select a tapestry element
            <br />
            to view its comments
          </Text>
        </div>
      )}
    </div>
  )
}
