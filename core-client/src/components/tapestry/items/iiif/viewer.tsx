import { lazy, memo, Suspense } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { IiifItem as IiifItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { ItemPlaceholder } from '../../item-placeholder'
import { LoadingSpinner } from '../../../lib/loading-spinner/index'
import { getPrimaryThumbnail } from '../../../../view-model/utils'
import styles from './styles.module.css'

const CloverViewer = lazy(() => import('@samvera/clover-iiif/viewer'))

// Clover instantiates this itself, with no props, in place of its own plain "Loading" text.
function IiifLoadingSpinner() {
  return <LoadingSpinner size="100px" />
}

// Do not pass Clover's id or manifestId props. Each one replaces iiifContent instead of
// identifying the instance.
export const IiifItemViewer = memo(({ id }: TapestryElementComponentProps) => {
  const { useStoreData } = useTapestryConfig()
  const dto = useStoreData(`items.${id}.dto`) as IiifItemDto
  const hasBeenActive = useStoreData(`items.${id}.hasBeenActive`)

  if (!hasBeenActive) {
    return (
      <div className={styles.root}>
        <ItemPlaceholder icon="image" thumbnailSrc={getPrimaryThumbnail(dto.thumbnail)}>
          Loading…
        </ItemPlaceholder>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <Suspense fallback={<LoadingSpinner size="100px" />}>
        <CloverViewer
          iiifContent={dto.source}
          options={{
            canvasHeight: '100%',
            showTitle: false,
            showIIIFBadge: false,
            showDownload: false,
            informationPanel: { open: false, renderContentSearch: false },
            // Some declared search services crash Clover's content-search probe.
            showMediaSearch: false,
            withCredentials: false,
            // A deep-zoom image sits on a fixed, opaque backdrop, not a themed one.
            background: '#fff',
            canvasBackgroundColor: '#fff',
            customLoadingComponent: IiifLoadingSpinner,
            openSeadragon: {
              crossOriginPolicy: 'Anonymous',
              ajaxWithCredentials: false,
              homeFillsViewer: true,
              showNavigator: false,
            },
          }}
        />
      </Suspense>
    </div>
  )
})
