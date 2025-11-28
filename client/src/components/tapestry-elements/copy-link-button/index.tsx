import { useTapestryPath } from '../../../hooks/use-tapestry-path'
import { useDispatch } from '../../../pages/tapestry/tapestry-providers'
import { setSnackbar } from '../../../pages/tapestry/view-model/store-commands/tapestry'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'

interface CopyLinkButtonProps {
  id: string
}

export function CopyLinkButton({ id }: CopyLinkButtonProps) {
  const dispatch = useDispatch()
  const tapestryPath = useTapestryPath('view', `?focus=${id}`)
  return (
    <IconButton
      icon="share"
      aria-label="Get link"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.origin}${tapestryPath}`)
        dispatch(setSnackbar('Link copied!'))
      }}
    />
  )
}
