import { ThumbnailRenditionOutput } from './index'
import { generateThumbnail } from './image'
import { spawn } from '../utils'

export async function generatePDFThumbnail(
  src: string,
  page: number,
  width: number,
): Promise<ThumbnailRenditionOutput> {
  const res = await fetch(src)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('application/pdf')) {
    throw new Error(`URL did not return a pdf (content-type: ${contentType || 'unknown'})`)
  }

  const inputBuffer = Buffer.from(await res.arrayBuffer())

  // prettier-ignore
  const magickArgs = [
    '-limit', 'memory', '256MiB',
    '-limit', 'map', '512MiB',
    '-limit', 'area', '100MP',
    '-density', '300',
    `pdf:-[${page - 1}]`,
    '-background', 'white',
    '-alpha', 'off',
    '-resize', `${width}x`,
    '-quality', '75',
    'jpg:-',
  ]

  const image = await spawn('magick', magickArgs, { input: inputBuffer })
  return generateThumbnail(image)
}
