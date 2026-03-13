/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { URL } from 'url'
import { config } from '../../config.js'
import { createJWT } from '../../auth/tokens.js'
import { REFRESH_TOKEN_COOKIE_NAME } from '../../auth/index.js'
import { initWebpage, inNewBrowserPage, WebpageConfig } from './webpage.js'
import { ThumbnailRenditionOutput } from './index.js'
import { generateThumbnail } from './image.js'
import { Page, ScreenshotOptions } from 'puppeteer'
import { Item } from '@prisma/client'

// Helper function that wraps Puppeteer's page.evaluate to avoid TS errors for missing browser (DOM) types
async function pageEval<T extends unknown[], R>(
  page: Page,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (global: any, ...args: T) => R,
  ...args: T
) {
  // @ts-expect-error This will be executed in a browser context
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return
  const globalHandle = await page.evaluateHandle(() => window)
  return page.evaluate(callback, globalHandle, ...args)
}

async function takeItemScreenshot(page: Page, item: Item) {
  await page.setViewport({
    // The browser window should be larger than the required element size in order to accommodate
    // for the tapestry controls around it.
    width: item.width + 100,
    height: item.height + 300,
    deviceScaleFactor: 2,
  })

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
    const element = await page.waitForSelector(`[data-model-id="${item.id}"]`, { visible: true })
    if (!element) return null

    const screenshot = await element.screenshot({ type: 'png', omitBackground: true })
    return generateThumbnail(Buffer.from(screenshot), {
      maxDim: Math.max(item.width, item.height),
      optimizeForText: item.type === 'text' || item.type === 'actionButton',
    })
  } finally {
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
  options: ScreenshotOptions,
) {
  const url = new URL(tapestryPath, config.server.viewerUrl)
  url.searchParams.set('deopt', '1')
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
