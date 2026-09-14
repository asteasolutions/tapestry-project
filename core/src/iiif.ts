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
 * Fetch a URL and confirm it is a real IIIF Presentation API manifest. Return its
 * canvas count. Return `null` for any network failure, non-JSON response, or a document
 * that is not a manifest (including a IIIF Collection, which this module does not
 * support) — check for `null` explicitly, since a manifest can have 0 canvases.
 */
export async function fetchIIIFCanvasCount(
  url: string,
  signal?: AbortSignal,
): Promise<number | null> {
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) return null
    const json: unknown = await response.json()
    const normalized = normalize(json)
    if (normalized.resource.type !== 'Manifest') return null
    return Object.keys(normalized.entities.Canvas).length
  } catch (error) {
    console.warn('Failed to fetch or parse IIIF manifest', error)
    return null
  }
}
