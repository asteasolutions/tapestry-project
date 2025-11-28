import { memo, useRef, useState } from 'react'
import styles from './styles.module.css'
import { DocumentCallback } from 'react-pdf/src/shared/types.js'
import { TapestryItemProps } from '..'
import { TapestryItem } from '../tapestry-item'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { PdfItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { PdfPageSelector } from 'tapestry-core-client/src/components/tapestry/items/pdf/page-selector'
import { useDispatch, useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { updateItem } from '../../../../pages/tapestry/view-model/store-commands/items'
import {
  PdfItemViewer,
  PdfViewerApi,
} from 'tapestry-core-client/src/components/tapestry/items/pdf/viewer'

export const PdfItem = memo(({ id }: TapestryItemProps) => {
  const pdfApi = useRef<PdfViewerApi>(null)
  const [pdfDocument, setPDFDocument] = useState<DocumentCallback | null>(null)
  const [page, setPage] = useState(0)

  const dto = useTapestryData(`items.${id}.dto`) as PdfItemDto
  const dispatch = useDispatch()

  const { toolbar } = useItemToolbar(id, {
    items: pdfDocument
      ? [
          <PdfPageSelector
            total={pdfDocument.numPages}
            page={page + 1}
            onChange={(newPage) => pdfApi.current?.navigateToPage(newPage - 1)}
            showTotal
          />,
        ]
      : [],
    moreMenuItems: pdfDocument
      ? [
          <div className={styles.defaultPageSelector}>
            <Text variant="bodySm">Set default page</Text>
            <PdfPageSelector
              total={pdfDocument.numPages}
              page={dto.defaultPage ?? 1}
              onChange={(page) => dispatch(updateItem(dto.id, { dto: { defaultPage: page } }))}
              showTotal={false}
            />
          </div>,
        ]
      : undefined,
  })

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
