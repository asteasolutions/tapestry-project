import CloverViewer from '@samvera/clover-iiif/viewer'
import CloverImage from '@samvera/clover-iiif/image'
import { memo } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { IiifItem as IiifItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { countIIIFCanvases, fetchIIIFManifest, parseIIIFManifest } from 'tapestry-core/src/iiif'
import { useAsync } from '../../../lib/hooks/use-async'
import styles from './styles.module.css'

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
  const { source } = useStoreData(`items.${id}.dto`) as IiifItemDto

  const { data: manifest } = useAsync(
    (abortController) =>
      source ? fetchIIIFManifest(source, abortController.signal) : Promise.resolve(null),
    [source],
  )

  if (!manifest) return null

  if (countIIIFCanvases(manifest) <= 1) {
    const canvas = parseIIIFManifest(manifest)
    if (!canvas) return null
    return (
      <div className={styles.root}>
        <CloverImage
          src={canvas.imageService}
          isTiledImage
          openSeadragonConfig={OPEN_SEADRAGON_CONFIG}
        />
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <CloverViewer
        iiifContent={source}
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
    </div>
  )
})
