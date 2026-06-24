/**
 * Minimal helpers for working with IIIF (International Image Interoperability Framework) content.
 *
 * We support the two widely deployed versions of the IIIF Presentation API - 2.x and 3.x - and extract just
 * enough information from a manifest to display its first canvas as a deep-zoomable image: the IIIF Image API
 * service endpoint and the intrinsic pixel dimensions of the image.
 *
 * Multi-canvas manifests (e.g. digitized books) are intentionally reduced to their first canvas for now.
 */

/** The information needed to render a single IIIF image as a deep-zoomable item. */
export interface IIIFCanvas {
  /**
   * The base URL of the IIIF Image API service for this canvas (i.e. the URL that serves `info.json` and tiles).
   * This is what a deep-zoom viewer such as OpenSeadragon consumes.
   */
  imageService: string
  /** A direct URL to a full-size rendering of the image, usable as a fallback when tiling is unavailable. */
  imageUrl: string
  /** The intrinsic width of the image, in pixels. */
  width: number
  /** The intrinsic height of the image, in pixels. */
  height: number
  /** An optional human-readable label for the canvas or manifest. */
  label?: string
}

// IIIF manifests are untyped JSON that varies between Presentation API versions, so we navigate them with
// small, defensive accessors rather than casts.
function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Returns the first element of an array, or the value itself if it isn't an array. */
function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  return typeof value === 'string' ? Number(value) : NaN
}

/** Extracts the id of a IIIF service, tolerating both the 2.x (`@id`) and 3.x (`id`) property names. */
function serviceId(service: unknown): string | undefined {
  const svc = asRecord(first(service))
  if (!svc) return undefined
  return asString(svc.id) ?? asString(svc['@id'])
}

/**
 * Resolves a IIIF label into a plain string. Handles the 3.x language map (`{ en: ['...'] }`), the 2.x
 * value object (`{ '@value': '...' }`), arrays of either, and bare strings.
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

/** Builds a IIIF Image API request URL (e.g. for a scaled-down rendering used as a thumbnail). */
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
 * Parses a IIIF Presentation API manifest (2.x or 3.x) and extracts the information needed to render its first
 * canvas. Returns `null` if the value is not a recognizable IIIF manifest with at least one image-bearing canvas.
 */
export function parseIIIFManifest(manifest: unknown): IIIFCanvas | null {
  const root = asRecord(manifest)
  if (!root) return null

  // Presentation API 3.x: manifest.items[] are canvases, each holding annotation pages -> annotations -> body.
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

  // Presentation API 2.x: manifest.sequences[].canvases[].images[].resource(.service)
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

/** Fetches a IIIF manifest by URL. Returns the parsed JSON, or `null` on any network/parse failure. */
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

/** Fetches a IIIF manifest and resolves its first canvas, or `null` if it is not a usable IIIF manifest. */
export async function fetchIIIFFirstCanvas(
  url: string,
  signal?: AbortSignal,
): Promise<IIIFCanvas | null> {
  const manifest = await fetchIIIFManifest(url, signal)
  return manifest ? parseIIIFManifest(manifest) : null
}
