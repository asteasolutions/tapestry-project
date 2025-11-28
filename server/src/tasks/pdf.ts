import { createWriteStream } from 'fs'
import { exec } from './utils'
import { tmpdir } from 'os'
import { resolve } from 'path'
import { randomUUID } from 'crypto'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import { unlink } from 'fs/promises'

export async function screenshotPage(src: string, page: number): Promise<Buffer | undefined> {
  const { body } = await fetch(src)
  if (!body) {
    return
  }
  const outFile = resolve(tmpdir(), `${randomUUID()}.pdf`)
  await finished(Readable.fromWeb(body).pipe(createWriteStream(outFile)))

  const buffer = Buffer.from(
    await exec(`magick "${outFile}[${page - 1}]" -density 96 -quality 75 jpg:- | base64`),
    'base64',
  )
  await unlink(outFile)
  return buffer
}
