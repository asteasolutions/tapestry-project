import { Page, PDFOptions } from 'puppeteer'
import { JobTypeMap } from '.'
import { prisma } from '../db'
import { initWebpage, inNewBrowserPage, scheduleTapestryThumbnailGeneration } from './utils'
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

async function getFaviconUrl(page: Page): Promise<string | null> {
  return page.evaluate((): string | null => {
    const globalContext = globalThis as unknown as {
      document: {
        querySelector: (
          selector: string,
        ) => { getAttribute: (attr: string) => string | null } | null
        baseURI: string
      }
    }

    const faviconHref = globalContext.document
      .querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
      ?.getAttribute('href')

    return faviconHref ? new URL(faviconHref, globalContext.document.baseURI).href : null
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
    const contentType = res.headers.get('content-type') || 'image/x-icon'

    return `data:${contentType};base64,${base64}`
  } catch (error) {
    console.error('>  Failed to fetch favicon', error instanceof Error ? error.message : error)
    return null
  }
}

function buildHeaderTemplate(faviconDataUri: string | null): string {
  return `
    <div style="
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f5f6f8;
      border: 1px solid #e2e4e8;
      border-radius: 6px;
      padding: 6px 12px;
      margin: 0 30px 0;
    ">
      <div style="display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 75%;">
        ${faviconDataUri ? `<img src="${faviconDataUri}" style="width: 14px; height: 14px; border-radius: 2px; flex-shrink: 0;" />` : ''}
        <span style="
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        " class="title"></span>
      </div>
      <span style="
        font-size: 11px;
        color: #9a9da3;
        margin-left: 12px;
        flex-shrink: 0;
      " class="date"></span>
    </div>
  `
}

const FOOTER_TEMPLATE = `
  <div style="
    width: 100%;
    box-sizing: border-box;
    padding: 0 30px;
  ">
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #e2e4e8;
      padding-top: 6px;
    ">
      <span style="
        font-size: 9px;
        color: #b0b3ba;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 70%;
      " class="url"></span>
      <span style="
        font-size: 8px;
        color: #9a9da3;
        letter-spacing: 0.3px;
        flex-shrink: 0;
      ">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </span>
    </div>
  </div>
`

async function convertWebpageToPdf(url: string, options?: PDFOptions) {
  let generator: ReturnType<typeof inNewBrowserPage<Uint8Array>> | undefined
  try {
    console.log(`Converting ${url} to pdf...`)
    generator = inNewBrowserPage(async function* (page, context): AsyncGenerator<Uint8Array> {
      await initWebpage(page, context, { url, autoconsent: true })

      console.log('>  Extracting favicon...')
      const faviconUrl = await getFaviconUrl(page)
      const faviconDataUri = await faviconUrlToDataUri(faviconUrl, url)

      console.log('>  Converting to pdf...')
      yield page.pdf({
        ...options,
        displayHeaderFooter: true,
        headerTemplate: buildHeaderTemplate(faviconDataUri),
        footerTemplate: FOOTER_TEMPLATE,
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
    throw error
  }
}
