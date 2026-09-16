import { lazy, memo, Suspense } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { IiifItem as IiifItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { ItemPlaceholder } from '../../item-placeholder'
import { ItemLoadingSpinner } from '../../item-loading-spinner'
import { getPrimaryThumbnail } from '../../../../view-model/utils'
import styles from './styles.module.css'

// Do not pass Clover's id or manifestId props. Each one replaces iiifContent instead of
// identifying the instance.
const CloverViewer = lazy(() => import('@samvera/clover-iiif/viewer'))

export const IiifItemViewer = memo(({ id }: TapestryElementComponentProps) => {
  const { useStoreData } = useTapestryConfig()
  const dto = useStoreData(`items.${id}.dto`) as IiifItemDto
  const hasBeenActive = useStoreData(`items.${id}.hasBeenActive`)

  // Clover instantiates this itself, with no props, in place of its own plain "Loading"
  // text -- defined here to close over `id`.
  function IiifLoadingSpinner() {
    return <ItemLoadingSpinner itemId={id} />
  }

  if (!hasBeenActive) {
    return (
      <div className={styles.root}>
        <ItemPlaceholder icon="image" thumbnailSrc={getPrimaryThumbnail(dto.thumbnail)}>
          Generating IIIF thumbnail…
        </ItemPlaceholder>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <Suspense fallback={<ItemLoadingSpinner itemId={id} />}>
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
