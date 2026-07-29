import { createWriteStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { spawn as nodeSpawn } from 'node:child_process'
import { ItemType } from 'tapestry-core/src/data-format/schemas/item'
import { queue } from '.'
import { prisma } from '../db'
import { config } from '../config'
import puppeteer, { BrowserContext, Page } from 'puppeteer'
import { Size } from 'tapestry-core/src/lib/geometry'
import { WithOptional } from 'tapestry-core/src/type-utils'
import { attatchAutoconsent, AutoconsentError } from './autoconsent'

const AUTOCONSENT_TIMEOUT = 20_000

// Helper function that wraps Puppeteer's page.evaluate to avoid TS errors for missing browser (DOM) types
export async function pageEval<T extends unknown[], R>(
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
export interface DownloadOpts {
  timeoutMs?: number
  maxBytes?: number
  allowedContentTypePrefixes?: string[] // e.g. "video/"
}

export async function downloadImageToArrayBuffer(url: string) {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) {
    throw new Error(`URL did not return an image (content-type: ${contentType || 'unknown'})`)
  }

  return Buffer.from(await res.arrayBuffer())
}

export async function downloadToTempFile(urlStr: string, opts: DownloadOpts = {}) {
  const url = new URL(urlStr)

  const {
    timeoutMs = 60_000,
    maxBytes = 200 * 1024 * 1024, // 200MB default limit
    allowedContentTypePrefixes,
  } = opts

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs)

  const res = await fetch(url, {
    redirect: 'follow',
    signal: abortController.signal,
  }).finally(() => clearTimeout(timeoutId))

  if (!res.ok || !res.body) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)

  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (allowedContentTypePrefixes?.every((prefix) => !contentType.startsWith(prefix))) {
    throw new Error(`Not a matching content-type: ${contentType || 'unknown'}`)
  }

  const contentLength = res.headers.get('content-length')
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error(`Content too large (content-length=${contentLength})`)
  }

  const extension = extname(url.pathname) || '.bin'
  const filePath = join(tmpdir(), `file-${randomUUID()}${extension}`)
  await finished(Readable.fromWeb(res.body).pipe(createWriteStream(filePath)))

  return filePath
}

export async function spawn(command: string, args: string[], input?: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    const proc = nodeSpawn(command, args, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] })
    const chunks: Buffer[] = []
    let err = ''

    proc.stdout!.on('data', (d: Buffer) => chunks.push(d))
    proc.stderr!.on('data', (d: Buffer) => (err += d.toString()))

    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`${command} exited ${code}: ${err}`))

      resolve(Buffer.concat(chunks))
    })

    if (input) {
      proc.stdin!.end(input)
    }
  })
}

export async function scheduleTapestryThumbnailGeneration(
  tapestryId: string,
  { skipDelay = false } = {},
) {
  await queue.remove(tapestryId)
  await queue.add(
    'generate-tapestry-thumbnails',
    { tapestryId },
    {
      jobId: tapestryId,
      delay: skipDelay ? 0 : config.worker.tapestryThumbnailGenerationDelay,
      removeOnComplete: true,
      removeOnFail: true,
    },
  )
}

interface GenerateThumbnailsOptions {
  tapestryId?: string
  ids?: string[]
  types?: ItemType[]
  forceRegenerate?: boolean
}

export async function generateThumbnails({
  tapestryId,
  ids,
  types,
  forceRegenerate,
}: GenerateThumbnailsOptions = {}) {
  const items = await prisma.item.updateManyAndReturn({
    where: {
      tapestryId,
      ...(ids ? { id: { in: ids } } : {}),
      ...(types ? { type: { in: types } } : {}),
    },
    data: { scheduledThumbnailProcessing: forceRegenerate ? 'recreate' : 'derive' },
    select: { tapestryId: true },
  })

  for (const id of new Set(items.map((item) => item.tapestryId))) {
    await scheduleTapestryThumbnailGeneration(id, { skipDelay: true })
  }
}

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
  autoconsent?: boolean
  setupContext?: (context: BrowserContext) => Promise<void>
}

export async function initWebpage(
  page: Page,
  context: BrowserContext,
  {
    url,
    windowSize,
    setupContext,
    timeout,
    autoconsent,
  }: WithOptional<WebpageConfig, 'windowSize'>,
) {
  console.log('>  Setting up context...')
  await setupContext?.(context)

  if (windowSize) {
    console.log('>  Configuring viewport...')
    await page.setViewport({ ...windowSize, deviceScaleFactor: 2 })
  }
  console.log(`>  Navigating to ${url}...`)
  await page.goto(url, { timeout: 120_000 })

  try {
    let autoconsentPromise: Promise<string | void> | undefined
    if (autoconsent) {
      autoconsentPromise = attatchAutoconsent(page, AUTOCONSENT_TIMEOUT)
        .then((res) => console.log(`Autoconsent completed: ${res}`))
        .catch((e) =>
          console.log(`Autoconsent failed: ${e instanceof AutoconsentError ? e.message : e}`),
        )
    }
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

    if (autoconsent) {
      console.log(`>  Waiting for autoconsent`)
      await autoconsentPromise
    }
  } catch (error) {
    console.warn('Error while waiting for the page to load. Proceeding anyway', error)
  }
}
