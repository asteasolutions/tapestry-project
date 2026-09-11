import { lazy, memo, Suspense } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { IiifItem as IiifItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { countIIIFCanvases, fetchIIIFManifest, parseIIIFManifest } from 'tapestry-core/src/iiif'
import { useAsync } from '../../../lib/hooks/use-async'
import { ItemPlaceholder } from '../../item-placeholder'
import { WebpageLoadingSpinner } from '../webpage/loading-spinner'
import { getPrimaryThumbnail } from '../../../../view-model/utils'
import styles from './styles.module.css'

const CloverViewer = lazy(() => import('@samvera/clover-iiif/viewer'))
const CloverImage = lazy(() => import('@samvera/clover-iiif/image'))

// Single-canvas manifests use <Image> with isTiledImage forced. An OpenSeadragon bug
// otherwise breaks a second, simultaneously open instance of the same manifest style.
// Multi-canvas manifests use <Viewer>. A narrower version of this bug still breaks the
// first canvas of a second instance there. This is a known, accepted limitation.
const OPEN_SEADRAGON_CONFIG = {
  crossOriginPolicy: 'Anonymous' as const,
  ajaxWithCredentials: false,
  homeFillsViewer: true,
  showNavigator: false,
}

// Do not pass Clover's id or manifestId props. Each one replaces iiifContent instead of
// identifying the instance.
export const IiifItemViewer = memo(({ id }: TapestryElementComponentProps) => {
  const { useStoreData } = useTapestryConfig()
  const dto = useStoreData(`items.${id}.dto`) as IiifItemDto
  const hasBeenActive = useStoreData(`items.${id}.hasBeenActive`)

  const { data: manifest } = useAsync(
    (abortController) =>
      hasBeenActive && dto.source
        ? fetchIIIFManifest(dto.source, abortController.signal)
        : Promise.resolve(null),
    [hasBeenActive, dto.source],
  )

  if (!hasBeenActive || !manifest) {
    return (
      <div className={styles.root}>
        <ItemPlaceholder icon="image" thumbnailSrc={getPrimaryThumbnail(dto.thumbnail)}>
          Loading…
        </ItemPlaceholder>
        {hasBeenActive && <WebpageLoadingSpinner itemId={id} />}
      </div>
    )
  }

  const spinner = <WebpageLoadingSpinner itemId={id} />

  if (countIIIFCanvases(manifest) <= 1) {
    const canvas = parseIIIFManifest(manifest)
    if (!canvas) return null
    return (
      <div className={styles.root}>
        <Suspense fallback={spinner}>
          <CloverImage
            src={canvas.imageService}
            isTiledImage
            openSeadragonConfig={OPEN_SEADRAGON_CONFIG}
          />
        </Suspense>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <Suspense fallback={spinner}>
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
            openSeadragon: OPEN_SEADRAGON_CONFIG,
          }}
        />
      </Suspense>
    </div>
  )
})
