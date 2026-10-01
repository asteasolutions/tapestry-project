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
            // Clover defaults <video>/<audio> to crossOrigin="anonymous", which requires a
            // real Access-Control-Allow-Origin on the final response (after any redirect).
            // Some real-world sources send CORS on their redirect but not on the file itself
            // -- e.g. archive.org's own /download/ redirect does, but the datanode host it
            // redirects to doesn't for at least .mp4 (verified: it does for .ogv on the same
            // host). Dropping crossOrigin lets ordinary, non-CORS media playback work against
            // sources like that, at the cost of cross-origin WebVTT captions (which do need
            // crossOrigin) not working -- an acceptable trade for AV playback over captions.
            crossOrigin: undefined,
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
