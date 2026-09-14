/**
 * Minimal helpers for IIIF (International Image Interoperability Framework) content.
 *
 * This module supports two IIIF Presentation API versions: 2.x and 3.x. It extracts only
 * what is needed to display the first canvas as a deep-zoomable image: the IIIF Image
 * API service endpoint, and the image's pixel dimensions.
 *
 * A multi-canvas manifest, like a digitized book, is reduced to its first canvas. This
 * is a deliberate limit, for now.
 */

/** The information needed to render a single IIIF image as a deep-zoomable item. */
export interface IIIFCanvas {
  /**
   * The base URL of the IIIF Image API service for this canvas. This URL serves
   * `info.json` and tiles. A deep-zoom viewer, like OpenSeadragon, consumes it directly.
   */
  imageService: string
  /** A direct URL to a full-size rendering of the image. Use it as a fallback when tiling is unavailable. */
  imageUrl: string
  /** The intrinsic width of the image, in pixels. */
  width: number
  /** The intrinsic height of the image, in pixels. */
  height: number
  /** An optional human-readable label for the canvas or manifest. */
  label?: string
}

const IMAGE_SERVICE_PARAM = 'imageService'

// An iiif item's source is the manifest URL. Add the resolved image service as a query
// param on that same URL. This avoids a separate database column. It also keeps source
// a real, fetchable manifest link.
export function withResolvedImageService(manifestUrl: string, imageService: string): string {
  const url = new URL(manifestUrl)
  url.searchParams.set(IMAGE_SERVICE_PARAM, imageService)
  return url.toString()
}

/** Read the resolved image service from an iiif item's source. */
export function getResolvedImageService(source: string): string | null {
  try {
    return new URL(source).searchParams.get(IMAGE_SERVICE_PARAM)
  } catch {
    return null
  }
}

/** Strip the resolved image service param. Return the real, plain manifest URL. */
export function getManifestUrl(source: string): string {
  try {
    const url = new URL(source)
    url.searchParams.delete(IMAGE_SERVICE_PARAM)
    return url.toString()
  } catch {
    return source
  }
}

// IIIF manifests are untyped JSON. Their shape varies between Presentation API
// versions. Navigate them with small, defensive accessors instead of type casts.
function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Return the first element of an array. If the value is not an array, return it as-is. */
function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  return typeof value === 'string' ? Number(value) : NaN
}

/** Extract the id of a IIIF service. Accept both the 2.x `@id` and 3.x `id` property names. */
function serviceId(service: unknown): string | undefined {
  const svc = asRecord(first(service))
  if (!svc) return undefined
  return asString(svc.id) ?? asString(svc['@id'])
}

/**
 * Resolve a IIIF label into a plain string. Handle the 3.x language map
 * (`{ en: ['...'] }`), the 2.x value object (`{ '@value': '...' }`), an array of either,
 * or a bare string.
 */
function parseLabel(label: unknown): string | undefined {
  if (typeof label === 'string') return label
  if (Array.isArray(label)) return parseLabel(label[0])
  const obj = asRecord(label)
  if (!obj) return undefined
  const atValue = asString(obj['@value'])
  if (atValue) return atValue
  const firstValue = Object.values(obj)[0]
  return asString(firstValue) ?? asString(Array.isArray(firstValue) ? firstValue[0] : undefined)
}

/** Build a IIIF Image API request URL. Use this, for example, to get a scaled-down rendering for a thumbnail. */
export function iiifImageURL(
  imageService: string,
  {
    region = 'full',
    size = 'max',
    rotation = 0,
    quality = 'default',
    format = 'jpg',
  }: {
    region?: string
    size?: string
    rotation?: number
    quality?: string
    format?: string
  } = {},
) {
  return `${imageService.replace(/\/$/, '')}/${region}/${size}/${rotation}/${quality}.${format}`
}

/**
 * Parse a IIIF Presentation API manifest, 2.x or 3.x. Extract the information needed to
 * render its first canvas. Return `null` if the value is not a recognizable IIIF
 * manifest, or has no image-bearing canvas.
 */
export function parseIIIFManifest(manifest: unknown): IIIFCanvas | null {
  const root = asRecord(manifest)
  if (!root) return null

  // Presentation API 3.x: `manifest.items[]` holds canvases. Each canvas holds
  // annotation pages, then annotations, then a body.
  if (Array.isArray(root.items)) {
    const canvas = asRecord(root.items[0])
    if (!canvas) return null
    const annotationPage = asRecord(first(canvas.items))
    const annotation = asRecord(first(annotationPage?.items))
    const body = asRecord(first(annotation?.body))
    const service = serviceId(body?.service)
    if (!service) return null
    return {
      imageService: service,
      imageUrl: asString(body?.id) ?? iiifImageURL(service),
      width: toNumber(canvas.width),
      height: toNumber(canvas.height),
      label: parseLabel(canvas.label) ?? parseLabel(root.label),
    }
  }

  // Presentation API 2.x: `manifest.sequences[].canvases[].images[].resource(.service)`
  if (Array.isArray(root.sequences)) {
    const sequence = asRecord(root.sequences[0])
    const canvas = asRecord(first(sequence?.canvases))
    if (!canvas) return null
    const resource = asRecord(asRecord(first(canvas.images))?.resource)
    const service = serviceId(resource?.service)
    if (!service) return null
    return {
      imageService: service,
      imageUrl: asString(resource?.['@id']) ?? iiifImageURL(service, { size: 'full' }),
      width: toNumber(canvas.width),
      height: toNumber(canvas.height),
      label: parseLabel(canvas.label) ?? parseLabel(root.label),
    }
  }

  return null
}

/** Fetch a IIIF manifest by URL. Return the parsed JSON. Return `null` on any network or parse failure. */
export async function fetchIIIFManifest(url: string, signal?: AbortSignal): Promise<unknown> {
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.warn('Failed to fetch IIIF manifest', error)
    return null
  }
}

/** Fetch a IIIF manifest. Resolve its first canvas. Return `null` if the manifest is not usable. */
export async function fetchIIIFFirstCanvas(
  url: string,
  signal?: AbortSignal,
): Promise<IIIFCanvas | null> {
  const manifest = await fetchIIIFManifest(url, signal)
  return manifest ? parseIIIFManifest(manifest) : null
}
