import OpenSeadragon from 'openseadragon'
import { memo, useEffect, useRef } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { IiifItem as IiifItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { getResolvedImageService } from 'tapestry-core/src/iiif'

/**
 * Render a IIIF image as a deep-zoomable, tiled viewer. Use OpenSeadragon. Read the
 * IIIF Image API endpoint from the item's source. OpenSeadragon loads its `info.json`
 * file and requests tiles on demand. This displays very large images, like
 * high-resolution scanned maps, without downloading the whole image.
 */
export const IiifItemViewer = memo(({ id }: TapestryElementComponentProps) => {
  const { useStoreData } = useTapestryConfig()
  const { source } = useStoreData(`items.${id}.dto`) as IiifItemDto
  const imageService = source ? getResolvedImageService(source) : null
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element || !imageService) return

    const viewer = OpenSeadragon({
      element,
      // OpenSeadragon detects the IIIF tile source from the Image API "info.json" descriptor.
      tileSources: `${imageService.replace(/\/$/, '')}/info.json`,
      // IIIF tiles load cross-origin (e.g. from iiif.archive.org). Load them anonymously,
      // matching the plain image viewer. This keeps Chrome from reusing a cache entry
      // that has the wrong CORS headers.
      crossOriginPolicy: 'Anonymous',
      ajaxWithCredentials: false,
      // Users zoom and pan with the mouse wheel, drag, and pinch. Omit the button
      // overlay. This needs no external control-icon assets, and stays uncluttered
      // inside a tapestry item.
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

  // Show a dark backdrop while OpenSeadragon fetches "info.json" and the first tiles.
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', backgroundColor: '#000' }} />
  )
})
