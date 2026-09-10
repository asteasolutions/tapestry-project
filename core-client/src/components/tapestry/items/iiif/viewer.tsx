import CloverViewer from '@samvera/clover-iiif/viewer'
import { memo } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { IiifItem as IiifItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { fetchIIIFManifest } from 'tapestry-core/src/iiif'
import { useAsync } from '../../../lib/hooks/use-async'
import styles from './styles.module.css'

/**
 * Render a full IIIF manifest — every canvas, its metadata, and structures/table of
 * contents — using Clover IIIF. Fetch the manifest ourselves first, rather than handing
 * Clover the bare URL: Clover would otherwise mount its own container and fetch the
 * manifest itself, showing an empty frame in the meantime. Only mount the viewer, with
 * the manifest already in hand, once there's actually something to show. (The
 * create-time wait — pasting a manifest URL to begin with — already gets Tapestry's
 * own pending-work indicator for free, since item creation validates the manifest
 * before the item exists at all; this is the separate wait for viewing an
 * already-created item again later.)
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
        // Disambiguates this instance's internal state/DOM ids from any other Viewer
        // on the page showing the same manifest (e.g. the same source imported twice).
        id={id}
        iiifContent={manifest}
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
