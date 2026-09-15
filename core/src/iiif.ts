/**
 * Minimal helpers for IIIF (International Image Interoperability Framework) content.
 *
 * Clover IIIF parses and renders a manifest directly from its URL, using its own
 * dependency, @iiif/parser. This module only needs to know whether a fetched document
 * is a real IIIF Presentation API manifest, and how many canvases it declares — for
 * recognizing a pasted manifest URL, and for picking a default item size. It supports
 * both IIIF Presentation API versions, 2.x and 3.x, since @iiif/parser does.
 */
import { normalize } from '@iiif/parser'

/**
 * Fetch a URL and parse it as a IIIF Presentation API manifest. Return `null` for any
 * network failure, non-JSON response, or a document that is not a manifest (including a
 * IIIF Collection, which this module does not support).
 */
export async function fetchIIIFManifest(url: string, signal?: AbortSignal) {
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) return null
    const json: unknown = await response.json()
    const normalized = normalize(json)
    return normalized.resource.type === 'Manifest' ? normalized : null
  } catch (error) {
    console.warn('Failed to fetch or parse IIIF manifest', error)
    return null
  }
}

/** Confirm a URL resolves to a real IIIF Presentation API manifest. */
export async function isIIIFManifest(url: string, signal?: AbortSignal) {
  return (await fetchIIIFManifest(url, signal)) !== null
}

/**
 * Fetch a URL and count the canvases (pages, images) its manifest declares. Return
 * `null` if the URL does not resolve to a manifest — check for `null` explicitly, since
 * a manifest can have 0 canvases.
 */
export async function fetchIIIFCanvasCount(url: string, signal?: AbortSignal) {
  const manifest = await fetchIIIFManifest(url, signal)
  return manifest ? Object.keys(manifest.entities.Canvas).length : null
}
