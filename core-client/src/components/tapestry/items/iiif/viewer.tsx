import CloverViewer from '@samvera/clover-iiif/viewer'
import { memo } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { IiifItem as IiifItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { Icon } from '../../../lib/icon/index'
import styles from './styles.module.css'

// Tapestry's own convention for "we're waiting on something" (see e.g. the webpage
// item's thumbnail-generation placeholder), not Clover's default "Loading" text.
function IiifLoadingIndicator() {
  return <Icon icon="hourglass_top" className={styles.loadingIndicator} />
}

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
          informationPanel: { open: false, renderContentSearch: false },
          // Some manifests declare a legacy Presentation 2.x SearchService1/
          // AutoCompleteService1 (e.g. Wellcome Collection's). Clover's content-search
          // probing of these can crash on the response. Tapestry doesn't need in-item
          // search anyway, so disable it outright rather than depend on that path.
          showMediaSearch: false,
          withCredentials: false,
          customLoadingComponent: IiifLoadingIndicator,
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
