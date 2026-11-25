import { CommentsList } from '../comments-list'
import { useTapestryData } from '../../pages/tapestry/tapestry-providers'

export function RelCommentsPane() {
  const interactiveElement = useTapestryData('interactiveElement')
  if (interactiveElement?.modelType !== 'rel') {
    return
  }

  return <CommentsList contextType={'rel'} contextId={interactiveElement.modelId} />
}
