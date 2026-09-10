import CloverViewer from '@samvera/clover-iiif/viewer'
import { memo } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { IiifItem as IiifItemDto } from 'tapestry-core/src/data-format/schemas/item'
import styles from './styles.module.css'

/**
 * Render a full IIIF manifest — every canvas, its metadata, and structures/table of
 * contents — using Clover IIIF. The item's source is the manifest URL itself; Clover
 * fetches and parses it directly, so nothing here needs to resolve a canvas ahead of
 * time.
 */
export const IiifItemViewer = memo(({ id }: TapestryElementComponentProps) => {
  const { useStoreData } = useTapestryConfig()
  const { source } = useStoreData(`items.${id}.dto`) as IiifItemDto

  if (!source) return null

  return (
    <div className={styles.root}>
      <CloverViewer
        // Disambiguates this instance's internal state/DOM ids from any other Viewer
        // on the page showing the same manifest (e.g. the same source imported twice).
        id={id}
        iiifContent={source}
        options={{
          canvasHeight: '100%',
          // Tapestry's own ItemToolbar already gives the item a title and controls.
          showTitle: false,
          showIIIFBadge: false,
          showDownload: false,
          informationPanel: { open: false },
          withCredentials: false,
          openSeadragon: {
            // IIIF tiles load cross-origin (e.g. from iiif.archive.org). Load them
            // anonymously, matching the plain image viewer.
            crossOriginPolicy: 'Anonymous',
            ajaxWithCredentials: false,
            // Fill the item's frame edge-to-edge instead of letterboxing, and skip the
            // minimap overlay — Tapestry's own zoom/pan chrome is the item itself.
            homeFillsViewer: true,
            showNavigator: false,
          },
        }}
      />
    </div>
  )
})
