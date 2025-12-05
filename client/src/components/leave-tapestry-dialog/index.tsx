import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { useTapestryPath } from '../../hooks/use-tapestry-path'
import { useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { itemUpload } from '../../services/item-upload'
import { BlockNavigationDialog } from '../block-navigation-dialog'

export function LeaveTapestryDialog() {
  const tapestryViewPath = useTapestryPath('view')
  const pendingRequests = useTapestryData('pendingRequests')

  const pendingUpload = useObservable(itemUpload).some((i) => i.state === 'uploading')

  return (
    <BlockNavigationDialog
      blockerFn={(location) =>
        !location?.nextLocation.pathname.startsWith(tapestryViewPath) &&
        (pendingRequests > 0 || pendingUpload)
      }
      onLeave={() => itemUpload.cancel()}
    />
  )
}
