import { memo, useRef, useState } from 'react'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { DocumentCallback } from 'react-pdf/src/shared/types.js'
import { TapestryItem } from '../tapestry-item'
import { TapestryElementComponentProps } from '../..'
import { PdfItemViewer, PdfViewerApi } from './viewer'
import { PdfPageSelector } from './page-selector'
import { ItemToolbar } from '../item-toolbar'

export const PdfItem = memo(({ id }: TapestryElementComponentProps) => {
  const pdfApi = useRef<PdfViewerApi>(null)
  const [pdfDocument, setPDFDocument] = useState<DocumentCallback | null>(null)
  const [page, setPage] = useState(0)

  const toolbar = (
    <ItemToolbar
      items={
        pdfDocument
          ? [
              <PdfPageSelector
                total={pdfDocument.numPages}
                page={page + 1}
                onChange={(newPage) => pdfApi.current?.navigateToPage(newPage - 1)}
                showTotal
              />,
            ]
          : []
      }
      tapestryItemId={id}
    />
  )

  return (
    <TapestryItem id={id} halo={toolbar}>
      <PdfItemViewer
        id={id}
        onPageChanged={setPage}
        onDocumentLoaded={setPDFDocument}
        apiRef={pdfApi}
      />
    </TapestryItem>
  )
})
