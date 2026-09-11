import { lazy, memo, Suspense } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { IiifItem as IiifItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { ItemPlaceholder } from '../../item-placeholder'
import { WebpageLoadingSpinner } from '../webpage/loading-spinner'
import { getPrimaryThumbnail } from '../../../../view-model/utils'
import styles from './styles.module.css'

const CloverViewer = lazy(() => import('@samvera/clover-iiif/viewer'))

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
      <Suspense fallback={<WebpageLoadingSpinner itemId={id} />}>
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
