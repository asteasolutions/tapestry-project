import CloverViewer from '@samvera/clover-iiif/viewer'
import { memo } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { IiifItem as IiifItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { fetchIIIFManifest } from 'tapestry-core/src/iiif'
import { useAsync } from '../../../lib/hooks/use-async'
import styles from './styles.module.css'

/**
 * Render a full IIIF manifest — every canvas, its metadata, and structures/table of
 * contents — using Clover IIIF. Confirm the manifest is actually reachable ourselves
 * first (so nothing renders until there's something to show).
 *
 * Do not pass Clover's `id` (or `manifestId`) prop: despite its doc comment, it is not
 * an instance-disambiguation key. Clover's own source
 * (`node_modules/@samvera/clover-iiif/dist/viewer/index.mjs`) shows it *replaces*
 * `iiifContent` outright (`let S = h; id && (S = id)`) — passing our own item id there
 * fed a non-URL, non-JSON string into Clover's "maybe this is a base64-encoded IIIF
 * Content State" fallback, which crashed trying to decode and JSON.parse it. Each
 * mounted CloverViewer already gets its own independent vault/state regardless.
 */
export const IiifItemViewer = memo(({ id }: TapestryElementComponentProps) => {
  const { useStoreData } = useTapestryConfig()
  const { source } = useStoreData(`items.${id}.dto`) as IiifItemDto

  const { data: manifest } = useAsync(
    (abortController) =>
      source ? fetchIIIFManifest(source, abortController.signal) : Promise.resolve(null),
    [source],
  )

  if (!manifest) return null

  return (
    <div className={styles.root}>
      <CloverViewer
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
