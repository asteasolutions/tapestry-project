import puppeteer, { BrowserContext, Page, ScreenshotOptions } from 'puppeteer'
import { config } from '../config.js'

// This is the user agent as if the browser was launched with { headless : false }.
// Vimeo appears to have some sort of filtering (evidently only for public videos) based on the user agent.
// When the puppeteer browser is launched with { headless: true } (the default) it automatically has "HeadlessChrome"
// as part of its user agent, which causes Vimeo to block the requests
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'

async function inNewBrowserPage<T>(perform: (page: Page, context: BrowserContext) => Promise<T>) {
  const start = Date.now()
  const browser = await puppeteer.launch({ args: config.worker.puppeteerArgs.split(',') })
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setUserAgent(USER_AGENT)

  try {
    return await perform(page, context)
  } finally {
    try {
      await browser.close()
    } catch (e) {
      console.debug('Error while closing puppeteer browser context', e)
    }
    console.log(`Browser session completed in ${Date.now() - start}ms.`)
  }
}

export interface ScreenshotConfig extends ScreenshotOptions {
  width: number
  height: number
  timeout?: number
  setupContext?: (context: BrowserContext) => Promise<void>
}

export async function takeScreenshot(
  url: string,
  { width, height, setupContext, timeout, ...options }: ScreenshotConfig,
) {
  console.log(`Taking screenshot of ${url} with dimensions ${width}x${height}...`)
  return inNewBrowserPage(async (page, context) => {
    console.log('>  Setting up context...')
    await setupContext?.(context)
    console.log('>  Configuring viewport...')
    await page.setViewport({ width, height })
    console.log(`>  Navigating to ${url}...`)
    await page.goto(url, { timeout: 120_000 })
    try {
      console.log(`>  Waiting for network idle...`)
      await page.waitForNetworkIdle({ idleTime: 3000, concurrency: 0, timeout: timeout ?? 60_000 })
    } catch (error) {
      console.warn(
        'Error while waiting for the page to load before taking a screenshot. ' +
          'Taking the screenshot anyway, but it may appear broken.',
        error,
      )
    }
    console.log('>  Taking screenshot...')
    return page.screenshot(options)
  })
}
