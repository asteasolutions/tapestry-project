import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { setSidePane } from '../../pages/tapestry/view-model/store-commands/tapestry'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { TooltipProps } from 'tapestry-core-client/src/components/lib/tooltip/index'

interface CommentButtonProps {
  count?: number
  type: string
  tooltip?: TooltipProps
}

export function CommentButton({ count = 0, type, tooltip }: CommentButtonProps) {
  const displaySidePane = useTapestryData('displaySidePane')
  const dispatch = useDispatch()
  return (
    <IconButton
      icon="chat_bubble"
      aria-label="Comment"
      onClick={() => dispatch(setSidePane(type, true))}
      isActive={displaySidePane === type}
      tooltip={tooltip}
    >
      {count !== 0 && <Text variant="bodySm">{count}</Text>}
    </IconButton>
  )
}
