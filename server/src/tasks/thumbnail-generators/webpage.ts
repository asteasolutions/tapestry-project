import axios from 'axios'
import { OEmbed } from 'tapestry-core/src/oembed.js'
import { WEB_SOURCE_PARSERS } from 'tapestry-core/src/web-sources/index.js'
import { generateThumbnail } from './image'
import { ScreenshotOptions } from 'puppeteer'
import { downloadImageToArrayBuffer, initWebpage, inNewBrowserPage, WebpageConfig } from '../utils'
import { config } from '../../config.js'

async function takeScreenshot(site: WebpageConfig, options?: ScreenshotOptions) {
  let generator: ReturnType<typeof inNewBrowserPage<Uint8Array>> | undefined
  try {
    const { url, windowSize: size } = site
    console.log(`Taking screenshot of ${url} with dimensions ${size.width}x${size.height}...`)
    generator = inNewBrowserPage(async function* (page, context): AsyncGenerator<Uint8Array> {
      await initWebpage(page, context, site)
      console.log('>  Taking screenshot...')
      yield page.screenshot(options)
    })

    const result = await generator.next()
    if (result.done) throw new Error('Expected one value but got none!')

    return result.value
  } finally {
    await generator?.return()
  }
}

export async function generateWebpageThumbnail(site: WebpageConfig, options?: ScreenshotOptions) {
  const url = new URL(site.url)
  // Pages of our own client may be embedded tapestries, so let them know they're being screenshotted
  if (url.host === new URL(config.server.viewerUrl).host) {
    url.searchParams.set('screenshotMode', 'embed')
  }
  const screenshot = await takeScreenshot({ ...site, url: url.toString() }, options)
  return generateThumbnail(Buffer.from(screenshot))
}

export async function generateYoutubeThumbnail(embedUrl: string) {
  const videoId = WEB_SOURCE_PARSERS.youtube.getVideoId(embedUrl)
  const urlsToTest = ['maxresdefault', 'hqdefault'].map(
    (variant) => `https://i.ytimg.com/vi/${videoId}/${variant}.jpg`,
  )

  for (const url of urlsToTest) {
    try {
      const arrayBuffer = await downloadImageToArrayBuffer(url)
      return generateThumbnail(arrayBuffer)
    } catch (error) {
      console.warn(`Failed to fetch YouTube thumbnail ${url}:`, error)
    }
  }

  // If we couldn't find a thumbnail from known URL formats, try the oEmbed API
  const { data: oembed } = await axios.get<OEmbed>(
    `https://www.youtube.com/oembed?url=${WEB_SOURCE_PARSERS.youtube.getWatchUrl(embedUrl)}`,
  )
  const { type, thumbnail_url: thumbnailUrl } = oembed
  if (type !== 'video' || !thumbnailUrl) return

  const { data: blob } = await axios.get<ArrayBuffer>(thumbnailUrl, {
    responseType: 'arraybuffer',
  })

  return generateThumbnail(Buffer.from(blob))
}
