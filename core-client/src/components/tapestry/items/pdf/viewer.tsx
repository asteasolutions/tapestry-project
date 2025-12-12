import clsx from 'clsx'
import { clamp, times } from 'lodash-es'
import {
  Ref,
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { DocumentCallback, Options } from 'react-pdf/src/shared/types.js'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { PdfItem as PdfItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { useTapestryConfig } from '../..'
import { getProminentScrollChild } from '../../../../lib/dom'
import { IconButton } from '../../../lib/buttons/index'
import { useAsync } from '../../../lib/hooks/use-async'
import { useDebounced } from '../../../lib/hooks/use-debounced'
import { useIsIntersecting } from '../../../lib/hooks/use-intersection-observer'
import { usePropRef } from '../../../lib/hooks/use-prop-ref'
import { Icon } from '../../../lib/icon/index'
import { LoadingSpinner } from '../../../lib/loading-spinner/index'
import { ItemPlaceholder } from '../../item-placeholder'
import styles from './styles.module.css'
import { useStartPage } from '../../hooks/use-start-page'

const PDF_OPTIONS: Options = {
  disableStream: true,
  disableAutoFetch: true,
  wasmUrl: '/wasm/',
}

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

function usePageHeights(doc: DocumentCallback | undefined, width: number) {
  return useAsync(async () => {
    if (!doc) {
      return undefined
    }

    return await Promise.all(
      times(doc.numPages, async (i) => {
        const { height, width: pageWidth } = (await doc.getPage(i + 1)).getViewport({ scale: 1 })
        return (height * width) / pageWidth
      }),
    )
  }, [doc, width])
}

interface PageWrapperProps {
  viewportRef: RefObject<HTMLDivElement | null>
  pageNumber: number
  width: number
  height: number
}

function PageWrapper({ pageNumber, viewportRef, width, height }: PageWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useIsIntersecting({ viewportRef, targetRef: ref })

  return (
    <div ref={ref} style={{ height: `${height}px`, backgroundColor: 'white' }}>
      {/* TODO: devicePixelRatio seems to counter the pixelization due to the tapestry zoom level.
        We should probably bind its value to it in some way. */}
      {visible && <Page pageNumber={pageNumber} scale={1} width={width} devicePixelRatio={4} />}
    </div>
  )
}

export interface PdfViewerApi {
  navigateToPage(page: number, behavior?: ScrollOptions['behavior']): void
}

export interface PdfViewerProps {
  id: Id
  onDocumentLoaded?: (document: DocumentCallback) => unknown
  onPageChanged?: (page: number) => unknown
  apiRef?: Ref<PdfViewerApi>
}

export function PdfItemViewer({ id, onDocumentLoaded, onPageChanged, apiRef }: PdfViewerProps) {
  const [pdfDocument, setPDFDocument] = useState<DocumentCallback>()
  const documentRef = useRef<HTMLDivElement>(null)
  const { useStoreData } = useTapestryConfig()
  const dto = useStoreData(`items.${id}.dto`) as PdfItemDto
  const isInteractive = useStoreData('interactiveElement')?.modelId === id
  const hasBeenActive = useStoreData(`items.${id}.hasBeenActive`)
  const [scrollTop, setScrollTop] = useState(0)
  const startPage = useStartPage(id)
  const [initialPage] = useState(startPage ?? (dto.defaultPage ?? 1) - 1)

  const width = useDebounced(dto.size.width, 200)
  const { data: pages } = usePageHeights(pdfDocument, width)
  const onDocumentLoadedRef = usePropRef(onDocumentLoaded)

  useEffect(() => {
    if (pages && pdfDocument) {
      onDocumentLoadedRef.current?.(pdfDocument)
    }
  }, [pages, pdfDocument, onDocumentLoadedRef])

  const pdfLoaded = pages && pdfDocument
  const navigateToPage = useCallback(
    (page: number, behavior: ScrollOptions['behavior'] = 'smooth') =>
      pdfLoaded &&
      documentRef.current?.scrollTo({
        top: (
          documentRef.current.children[
            clamp(page, 0, documentRef.current.children.length - 1)
          ] as HTMLElement
        ).offsetTop,
        behavior,
      }),
    [pdfLoaded],
  )

  useImperativeHandle(apiRef, () => ({ navigateToPage }))

  useEffect(() => navigateToPage(initialPage, 'instant'), [initialPage, navigateToPage])

  return (
    <>
      {hasBeenActive && (
        <Document
          file={dto.source}
          onLoadSuccess={setPDFDocument}
          className={clsx(styles.root, { [styles.interactive]: isInteractive })}
          onItemClick={(item) => navigateToPage(item.pageIndex)}
          inputRef={documentRef}
          options={PDF_OPTIONS}
          onScroll={(e: Event) => {
            const target = e.currentTarget as HTMLElement
            setScrollTop(target.scrollTop)
            onPageChanged?.(getProminentScrollChild(target).index)
          }}
        >
          {pages?.map((height, ind) => (
            <PageWrapper
              key={ind}
              pageNumber={ind + 1}
              width={width}
              viewportRef={documentRef}
              height={height}
            />
          ))}
          {isInteractive && scrollTop !== 0 && (
            <IconButton
              icon="vertical_align_top"
              aria-label="Go to top"
              className={styles.goToTop}
              onClick={() => navigateToPage(0)}
            />
          )}
        </Document>
      )}
      {!pages && (
        <div className={styles.loadingPlaceholder}>
          <ItemPlaceholder
            classes={{
              root: styles.placeholder,
              thumbnail: styles.thumbnail,
            }}
            icon="picture_as_pdf"
            thumbnailSrc={dto.customThumbnail ?? dto.thumbnail?.source}
            thumbnailOverlay={<Icon icon="picture_as_pdf" className={styles.overlay} />}
          >
            Click to load
          </ItemPlaceholder>
          {hasBeenActive && <LoadingSpinner size="100px" className={styles.spinner} />}
        </div>
      )}
    </>
  )
}
