import axios from 'axios'
import { OEmbed } from 'tapestry-core/src/oembed.js'
import { Size } from 'tapestry-core/src/lib/geometry'
import { WEB_SOURCE_PARSERS } from 'tapestry-core/src/web-sources/index.js'
import { generateThumbnail } from './image'
import puppeteer, { BrowserContext, Page, ScreenshotOptions } from 'puppeteer'
import { config } from '../../config.js'
import { downloadImageToArrayBuffer } from '../utils'

// This is the user agent as if the browser was launched with { headless : false }.
// Vimeo appears to have some sort of filtering (evidently only for public videos) based on the user agent.
// When the puppeteer browser is launched with { headless: true } (the default) it automatically has "HeadlessChrome"
// as part of its user agent, which causes Vimeo to block the requests
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'

export async function* inNewBrowserPage<T, R = void, N = void>(
  perform: (page: Page, context: BrowserContext) => AsyncGenerator<T, R, N>,
) {
  const start = Date.now()
  const browser = await puppeteer.launch({ args: config.worker.puppeteerArgs.split(',') })
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setUserAgent({ userAgent: USER_AGENT })

  try {
    yield* perform(page, context)
  } finally {
    try {
      await browser.close()
    } catch (e) {
      console.debug('Error while closing puppeteer browser context', e)
    }
    console.log(`Browser session completed in ${Date.now() - start}ms.`)
  }
}

export interface WebpageConfig {
  url: string
  windowSize: Size
  timeout?: number
  setupContext?: (context: BrowserContext) => Promise<void>
}

export async function initWebpage(
  page: Page,
  context: BrowserContext,
  { url, windowSize, setupContext, timeout }: WebpageConfig,
) {
  console.log('>  Setting up context...')
  await setupContext?.(context)
  console.log('>  Configuring viewport...')
  await page.setViewport({ ...windowSize, deviceScaleFactor: 2 })
  console.log(`>  Navigating to ${url}...`)
  await page.goto(url, { timeout: 120_000 })
  try {
    console.log(`>  Waiting for network idle...`)
    await page.waitForNetworkIdle({
      idleTime: 3000,
      concurrency: 0,
      timeout: timeout ?? 60_000,
    })
    console.log(`>  Waiting for fonts to load...`)
    // @ts-expect-error The following expression will be evaluated in the browser context
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    await page.evaluate(() => document.fonts.ready)
  } catch (error) {
    console.warn(
      'Error while waiting for the page to load before taking a screenshot. ' +
        'Taking the screenshot anyway, but it may appear broken.',
      error,
    )
  }
}

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
  const screenshot = await takeScreenshot(site, options)
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
