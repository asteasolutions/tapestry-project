import { memo, useRef, useState } from 'react'
import { DocumentCallback } from 'react-pdf/src/shared/types.js'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { PdfPageSelector } from 'tapestry-core-client/src/components/tapestry/items/pdf/page-selector'
import {
  PdfItemViewer,
  PdfViewerApi,
} from 'tapestry-core-client/src/components/tapestry/items/pdf/viewer'
import { PdfItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryItemProps } from '..'
import { useDispatch, useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { updateItem } from '../../../../pages/tapestry/view-model/store-commands/items'
import { buildToolbarMenu, ItemToolbarMenuItem } from '../../item-toolbar'
import { PdfShareMenu, shareMenu } from '../../item-toolbar/share-menu'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { TapestryItem } from '../tapestry-item'
import styles from './styles.module.css'

export const PdfItem = memo(({ id }: TapestryItemProps) => {
  const pdfApi = useRef<PdfViewerApi>(null)
  const [pdfDocument, setPDFDocument] = useState<DocumentCallback | null>(null)
  const [page, setPage] = useState(0)

  const dto = useTapestryData(`items.${id}.dto`) as PdfItemDto
  const dispatch = useDispatch()

  const isEdit = useTapestryData('interactionMode') === 'edit'

  const { toolbar } = useItemToolbar(id, {
    items: (ctrls) => {
      const pageSelector: ItemToolbarMenuItem[] = pdfDocument
        ? [
            <PdfPageSelector
              total={pdfDocument.numPages}
              page={page + 1}
              onChange={(newPage) => pdfApi.current?.navigateToPage(newPage - 1)}
              showTotal
            />,
            'separator',
          ]
        : []

      const [editorControls, viewerControls] = buildToolbarMenu({
        dto,
        share:
          pdfDocument &&
          shareMenu({
            selectSubmenu: (id) => ctrls.selectSubmenu(id, true),
            selectedSubmenu: ctrls.selectedSubmenu,
            menu: (
              <PdfShareMenu item={dto} totalPages={pdfDocument.numPages} currentPage={page + 1} />
            ),
          }),
        omit: { share: !pdfDocument },
      })

      return isEdit ? [...pageSelector, ...editorControls] : [...pageSelector, ...viewerControls]
    },
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
