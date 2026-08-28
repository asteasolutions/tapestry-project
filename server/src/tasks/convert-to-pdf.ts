import { Page, PDFOptions } from 'puppeteer'
import { JobTypeMap } from '.'
import { prisma } from '../db'
import {
  initWebpage,
  inNewBrowserPage,
  pageEval,
  scheduleTapestryThumbnailGeneration,
} from './utils'
import { s3Service, tapestryKey } from '../services/s3-service'
import { DBSubscriber } from '../socket'
import { pick } from 'lodash-es'
import { Item } from '@prisma/client'

const MIN_PDF_PAGE = {
  width: 600,
  height: 2000,
}

const CONVERT_ITEM_PROPS = [
  'positionX',
  'positionY',
  'width',
  'height',
  'tapestryId',
  'groupId',
  'dropShadow',
] satisfies (keyof Item)[]

type FaviconWindow = {
  document: {
    querySelector: (selector: string) => {
      getAttribute: (attr: string) => string | null
    } | null
    baseURI: string
  }
}

async function getFaviconUrl(page: Page): Promise<string | null> {
  return pageEval(page, (window) => {
    const browserWindow = window as FaviconWindow

    const faviconHref = browserWindow.document
      .querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
      ?.getAttribute('href')

    return faviconHref ? new URL(faviconHref, browserWindow.document.baseURI).href : null
  })
}

async function faviconUrlToDataUri(
  faviconUrl: string | null,
  pageUrl: string,
): Promise<string | null> {
  const url = faviconUrl ?? `${new URL(pageUrl).origin}/favicon.ico`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return null

    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const contentType = res.headers.get('content-type') ?? 'image/x-icon'

    return `data:${contentType};base64,${base64}`
  } catch (error) {
    console.error('>  Failed to fetch favicon', error instanceof Error ? error.message : error)
    return null
  }
}

function buildHeaderTemplate(faviconDataUri: string | null): string {
  return `
    <div style="width: 100%; display: flex; box-sizing: border-box; align-items: center; background: #f5f6f8; border: 1px solid #e2e4e8; padding: 6px 12px; margin: 0 30px; overflow: hidden; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; overflow: hidden;">
        ${faviconDataUri ? `<img src="${faviconDataUri}" style="width: 14px; height: 14px; border-radius: 2px; flex-shrink: 0;" />` : ''}
        <span style="font-size: 12px; font-weight: 600; color: #1a1a1a; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;" class="title"></span>
      </div>
      <span style="font-size: 10px; color: #9a9da3; flex-shrink: 0;" class="date"></span>
    </div>
  `
}

function buildFooterTemplate(pageUrl: string): string {
  return `
    <div style="width: 100%; box-sizing: border-box; padding: 0 30px;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e4e8; padding-top: 6px;">
        <a href="${pageUrl}" style="font-size: 10px; color: #b0b3ba; text-decoration: underline; max-width: 85%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${pageUrl}</a>
        <span style="font-size: 8px; color: #9a9da3; flex-shrink: 0;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </span>
      </div>
    </div>
  `
}

async function convertWebpageToPdf(url: string, options?: PDFOptions) {
  let generator: ReturnType<typeof inNewBrowserPage<Uint8Array>> | undefined
  try {
    console.log(`Converting ${url} to pdf...`)
    generator = inNewBrowserPage(async function* (page, context): AsyncGenerator<Uint8Array> {
      await initWebpage(page, context, { url, autoconsent: true })

      console.log('>  Extracting favicon...')
      const faviconDataUri = await faviconUrlToDataUri(await getFaviconUrl(page), url)

      console.log('>  Converting to pdf...')
      yield page.pdf({
        ...options,
        displayHeaderFooter: true,
        headerTemplate: buildHeaderTemplate(faviconDataUri),
        footerTemplate: buildFooterTemplate(url),
      })
    })

    const result = await generator.next()
    if (result.done) throw new Error('Expected one value but got none!')

    return result.value
  } finally {
    await generator?.return()
  }
}

export async function convertToPdf({ itemId }: JobTypeMap['convert-to-pdf']) {
  try {
    const item = await prisma.item.findUniqueOrThrow({
      where: { id: itemId },
    })

    if (item.type !== 'webpage' || !item.source) {
      throw new Error(`PDF convertion not supported for item type ${item.type}`)
    }

    const value = await convertWebpageToPdf(item.source, {
      width: Math.max(item.width, MIN_PDF_PAGE.width),
      height: Math.max(item.height, MIN_PDF_PAGE.height),
      margin: { right: 20, left: 20, top: 60, bottom: 60 },
    })

    const s3Key = tapestryKey(item.tapestryId, `${crypto.randomUUID()}.pdf`, true)
    await s3Service.putObject(s3Key, value, 'application/pdf')

    await prisma.$transaction(async (tx) => {
      const deletedItem = await tx.item.delete({ where: { id: item.id } })
      await tx.item.create({
        data: {
          ...pick(deletedItem, CONVERT_ITEM_PROPS),
          type: 'pdf',
          source: s3Key,
          scheduledThumbnailProcessing: 'derive',
        },
      })
    })

    await scheduleTapestryThumbnailGeneration(item.tapestryId)

    await DBSubscriber.fireNotification({
      name: 'tapestry-updated',
      tapestryId: item.tapestryId,
      deletedIds: { items: [item.id] },
    })
  } catch (error) {
    console.error(`Error while converting item ${itemId} to pdf`, error)
  }
}
