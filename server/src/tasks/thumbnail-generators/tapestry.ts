/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { URL } from 'url'
import { config } from '../../config.js'
import { createJWT } from '../../auth/tokens.js'
import { REFRESH_TOKEN_COOKIE_NAME } from '../../auth/index.js'
import { ThumbnailRenditionOutput } from './index.js'
import { generateThumbnail } from './image.js'
import { Page, ScreenshotOptions } from 'puppeteer'
import { Item } from '@prisma/client'
import { innerFit } from 'tapestry-core/src/lib/geometry.js'
import { initWebpage, inNewBrowserPage, pageEval, WebpageConfig } from '../utils.js'

const MAX_ITEM_SIZE = 2000

async function takeItemScreenshot(page: Page, item: Item) {
  const size = innerFit(item, { width: MAX_ITEM_SIZE, height: MAX_ITEM_SIZE })
  size.width = Math.round(size.width)
  size.height = Math.round(size.height)

  console.log(
    `Taking screenshot of item ${item.id} with dimensions ${size.width}x${size.height}...`,
  )

  console.log('> Setting viewport size...')

  await page.setViewport({
    // The browser window should be larger than the required element size in order to accommodate
    // for the element toolbar space
    width: size.width,
    height: size.height + 100,
    deviceScaleFactor: 2,
  })

  console.log('> Focusing item...')
  await pageEval(
    page,
    async (window, itemId) => {
      // Waiting for requestAnimationFrame after updating the viewport size
      // ensures the browser has updated its layout and is ready to draw.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await new Promise(window.requestAnimationFrame)

      // Focus and deactivate the element
      window.postMessage({ type: 'tapestry:focus', itemId, animate: false })
      window.postMessage({ type: 'tapestry:deactivate' })

      // Hide all other elements to avoid them appearing in the screenshot in case of overlapping transparent items
      window.postMessage({ type: 'tapestry:hideAllItems', except: itemId })
    },
    item.id,
  )

  try {
    console.log('> Waiting for item selector to become visible...')
    const element = await page.waitForSelector(`[data-model-id="${item.id}"]`, { visible: true })
    if (!element) return null

    console.log('> Waiting for fonts...')
    await pageEval(page, async (window) => {
      await window.document.fonts.ready
    })

    console.log('> Taking screenshot...')
    const screenshot = await element.screenshot({ type: 'png', omitBackground: true })

    console.log('> Generating thumbnail from screenshot...')
    return generateThumbnail(Buffer.from(screenshot), {
      maxDim: Math.max(size.width, size.height),
      optimizeForText: item.type === 'text' || item.type === 'actionButton',
    })
  } catch (error) {
    console.log('> Error!', error)
  } finally {
    console.log('> Resetting item visibility.')
    // Revert hidden item visibility
    await pageEval(page, (window) => {
      window.postMessage({ type: 'tapestry:showAllItems' })
    })
  }
}

export async function* takeTapestryScreenshots(
  tapestryPath: string,
  userId: string,
  site: Omit<WebpageConfig, 'url' | 'setupContext'>,
  options?: ScreenshotOptions,
) {
  const url = new URL(tapestryPath, config.server.viewerUrl)
  url.searchParams.set('deopt', '1')
  url.searchParams.set('hideControls', '1')
  const src = url.toString()
  const { windowSize, timeout } = site
  console.log(`Taking screenshots of ${src}...`)
  yield* inNewBrowserPage(async function* (page, context): AsyncGenerator<
    ThumbnailRenditionOutput,
    void,
    Item | null
  > {
    console.log(`>  Taking screenshot with dimensions ${windowSize.width}x${windowSize.height}...`)
    await initWebpage(page, context, {
      url: src,
      windowSize,
      timeout,
      setupContext: (context) =>
        context.setCookie({
          domain: new URL(config.server.externalUrl).host,
          name: REFRESH_TOKEN_COOKIE_NAME,
          value: createJWT({ userId }, '10m'),
          expires: -1, // Session cookie
          httpOnly: true,
          secure: true,
        }),
    })

    // First take a screenshot of the whole tapestry
    const screenshot = await page.screenshot(options)
    let item = yield await generateThumbnail(Buffer.from(screenshot))

    if (!item) return

    // Remove the page background so that item screenshots can be taken with transparency
    await pageEval(page, (window) => {
      window.document.documentElement.style.background = 'transparent'
      window.document.body.style.background = 'transparent'
    })

    while (item) {
      const thumbnail = await takeItemScreenshot(page, item)
      if (thumbnail) {
        item = yield thumbnail
      }
    }
  })
}
