import { spawn } from '../utils'
import { ThumbnailRenditionOutput } from '.'
import { generateThumbnail } from './image'

function extractVideoThumbnailFromUrl(videoUrl: string, startTime = 1, width = 320) {
  // prettier-ignore
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-nostdin",
    "-ss", String(startTime),
    "-i", videoUrl,
    "-frames:v", "1",
    "-an", "-sn", "-dn",
    // scale with aspect preserved; -2 makes height even
    "-vf", `scale=${width}:-2:flags=lanczos`,
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "pipe:1",
  ];

  return spawn('ffmpeg', args)
}

export async function generateVideoThumbnail(
  videoUrl: string,
  startTime: number | undefined,
  width: number,
): Promise<ThumbnailRenditionOutput> {
  const frame = await extractVideoThumbnailFromUrl(videoUrl, startTime, width)
  return generateThumbnail(frame)
}
