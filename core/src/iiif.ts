/**
 * Minimal helpers for IIIF (International Image Interoperability Framework) content.
 *
 * Clover IIIF parses and renders a manifest directly from its URL, using its own
 * dependency, @iiif/parser. This module only needs to know whether a fetched document
 * is a real IIIF Presentation API manifest, how many canvases it declares, and how to
 * find a manifest URL a user pasted from a viewer's own shareable link. It supports both
 * IIIF Presentation API versions, 2.x and 3.x, since @iiif/parser does.
 */
import { normalize } from '@iiif/parser'

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

export async function isIIIFManifest(url: string, signal?: AbortSignal) {
  return (await fetchIIIFManifest(url, signal)) !== null
}

export async function fetchIIIFCanvasCount(url: string, signal?: AbortSignal) {
  const manifest = await fetchIIIFManifest(url, signal)
  return manifest ? Object.keys(manifest.entities.Canvas).length : null
}

/**
 * Extract a IIIF Content State API `iiif-content` parameter's value from a URL, e.g. a
 * viewer's shareable link. For example, given
 * `https://projectmirador.org/embed/?iiif-content=https://iiif.archive.org/iiif/b29000427_0001/manifest.json`,
 * return `https://iiif.archive.org/iiif/b29000427_0001/manifest.json`. Only the plain-URL
 * form of a content state is supported, not the Base64-encoded JSON-LD form. Return
 * `null` if the URL has no `iiif-content` parameter, or its value is not itself a URL.
 */
export function extractIIIFContentStateURL(url: string) {
  let contentState: string | null
  try {
    contentState = new URL(url).searchParams.get('iiif-content')
  } catch {
    return null
  }
  if (!contentState) return null

  try {
    return new URL(contentState).href
  } catch {
    return null
  }
}
