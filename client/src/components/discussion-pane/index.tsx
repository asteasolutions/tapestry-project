import { CommentsList } from '../comments-list'
import { useTapestryData } from '../../pages/tapestry/tapestry-providers'

export function DiscussionPane() {
  const tapestryId = useTapestryData('id')

  return <CommentsList contextType={'tapestry'} contextId={tapestryId} />
}
