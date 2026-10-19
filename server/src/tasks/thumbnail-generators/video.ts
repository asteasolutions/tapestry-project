import { fetchContentLength, spawn } from '../utils'
import { ThumbnailRenditionOutput } from '.'
import { generateThumbnail } from './image'
import { MAX_SOURCE_FILE_SIZE } from 'tapestry-shared/src/utils'

const FFMPEG_TIMEOUT = 60_000
const FFMPEG_RW_TIMEOUT = 20_000_000

function extractVideoThumbnailFromUrl(videoUrl: string, startTime = 1, width = 320) {
  // prettier-ignore
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-nostdin",
    "-rw_timeout", String(FFMPEG_RW_TIMEOUT),
    "-ss", String(startTime),
    "-i", videoUrl,
    "-frames:v", "1",
    "-an", "-sn", "-dn",
    // scale with aspect preserved; -2 makes height even
    "-vf", `scale=${width}:-2:flags=lanczos`,
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "pipe:1",
  ]

  return spawn('ffmpeg', args, { timeoutMs: FFMPEG_TIMEOUT })
}

export async function generateVideoThumbnail(
  videoUrl: string,
  startTime: number | undefined,
  width: number,
): Promise<ThumbnailRenditionOutput> {
  const contentLength = await fetchContentLength(videoUrl)
  if (contentLength && contentLength > MAX_SOURCE_FILE_SIZE) {
    throw new Error(`Content too large (content-length=${contentLength})`)
  }

  const frame = await extractVideoThumbnailFromUrl(videoUrl, startTime, width)
  return generateThumbnail(frame)
}
