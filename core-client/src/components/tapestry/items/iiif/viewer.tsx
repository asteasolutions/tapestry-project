import OpenSeadragon from 'openseadragon'
import { memo, useEffect, useRef } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { IiifItem as IiifItemDto } from 'tapestry-core/src/data-format/schemas/item'

/**
 * Renders a IIIF image as a deep-zoomable, tiled viewer using OpenSeadragon. The item's `imageService`
 * is the IIIF Image API endpoint; OpenSeadragon loads its `info.json` and requests tiles on demand, so we
 * can display very large images (e.g. high-resolution scanned maps) without downloading the whole image.
 */
export const IiifItemViewer = memo(({ id }: TapestryElementComponentProps) => {
  const { useStoreData } = useTapestryConfig()
  const { imageService } = useStoreData(`items.${id}.dto`) as IiifItemDto
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element || !imageService) return

    const viewer = OpenSeadragon({
      element,
      // The IIIF Image API "info.json" descriptor; OpenSeadragon detects the IIIF tile source from it.
      tileSources: `${imageService.replace(/\/$/, '')}/info.json`,
      // IIIF tiles are served cross-origin (e.g. from iiif.archive.org), so load them anonymously, matching
      // the plain image viewer. This keeps Chrome from reusing cache entries with the wrong CORS headers.
      crossOriginPolicy: 'Anonymous',
      ajaxWithCredentials: false,
      // Zoom/pan via mouse wheel, drag and pinch. We omit the button overlay so the viewer stays
      // self-contained (no external control-icon assets) and uncluttered inside a tapestry item.
      showNavigationControl: false,
      showZoomControl: false,
      showHomeControl: false,
      showFullPageControl: false,
      gestureSettingsMouse: { clickToZoom: false },
      visibilityRatio: 1,
      minZoomImageRatio: 0.8,
    })

    return () => viewer.destroy()
  }, [imageService])

  // A dark backdrop is shown while OpenSeadragon fetches "info.json" and the first tiles.
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', backgroundColor: '#000' }} />
  )
})
