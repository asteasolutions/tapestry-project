import { exec } from './utils'

export async function getVideoFPS(source: string): Promise<number> {
  const [num, denom] = (
    await exec(
      `ffprobe -v 0 -of csv=p=0 -select_streams v:0 -show_entries stream=r_frame_rate "${source}"`,
    )
  ).split('/')

  return Math.round(Number.parseInt(num) / Number.parseInt(denom))
}

export async function extractVideoFrame(source: string, frame = 0): Promise<Buffer> {
  return Buffer.from(
    await exec(
      `ffmpeg -i "${source}"  -vf "select=eq(n\\,${frame})" -vframes 1 -f image2 pipe:1 2>/dev/null | base64`,
    ),
    'base64',
  )
}
