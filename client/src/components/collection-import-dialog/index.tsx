import clsx from 'clsx'
import { compact } from 'lodash-es'
import { useState } from 'react'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { openverseMediaPageURL } from 'tapestry-core/src/openverse'
import { wikimediaFilePageURL, WikimediaMediaType } from 'tapestry-core/src/wikimedia-commons'
import { IAMediaType } from 'tapestry-core/src/internet-archive'
import { toggleElement } from 'tapestry-core/src/lib/array'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { CollectionImport } from '../../pages/tapestry/view-model/index'
import { addAndPositionItems } from '../../pages/tapestry/view-model/store-commands/items'
import { setCollectionImports } from '../../pages/tapestry/view-model/store-commands/tapestry'
import { createItemViewModel } from '../../pages/tapestry/view-model/utils'
import { Breakpoint, useResponsive } from '../../providers/responsive-provider'
import { createIAMediaItems, createExternalMediaItems } from '../../stage/item-factories'
import { ImportDetails } from './import-details/index'
import { ImportItemsList } from './import-items-list/index'
import styles from './styles.module.css'

export interface ImportItem {
  id: string
  mediaType?: IAMediaType
  sourceUrl?: string
  wikimediaMediaType?: WikimediaMediaType
}

const COLLECTION_IMPORT_TITLE_MAP: Record<CollectionImport['type'], string> = {
  IACollection: 'Choose collection items',
  IAPlaylist: 'Choose playlist items',
  OpenverseCollection: 'Choose items to import',
  WikimediaCommonsCategory: 'Choose items to import',
  IASearchCollection: 'Choose search result items',
}

const COLLECTION_IMPORT_CLASS_MAP: Record<CollectionImport['type'], string> = {
  IACollection: styles.collectionList,
  IAPlaylist: styles.playlist,
  OpenverseCollection: styles.collectionList,
  WikimediaCommonsCategory: styles.collectionList,
  IASearchCollection: styles.collectionList,
}

async function createNewItems(
  collectionImport: CollectionImport,
  items: ImportItem[],
  tapestryId: string,
) {
  if (collectionImport.type === 'OpenverseCollection') {
    const { mediaType } = collectionImport
    return createExternalMediaItems(
      tapestryId,
      compact(
        items.map(
          ({ id, sourceUrl }) =>
            sourceUrl && {
              url: sourceUrl,
              pageUrl: openverseMediaPageURL(mediaType, id),
              mediaType,
            },
        ),
      ),
    )
  }

  if (collectionImport.type === 'WikimediaCommonsCategory') {
    return createExternalMediaItems(
      tapestryId,
      compact(
        items.map(
          ({ id, sourceUrl, wikimediaMediaType }) =>
            sourceUrl &&
            wikimediaMediaType && {
              url: sourceUrl,
              pageUrl: wikimediaFilePageURL(id),
              mediaType: wikimediaMediaType,
            },
        ),
      ),
    )
  }

  if (collectionImport.type === 'IACollection' || collectionImport.type === 'IASearchCollection') {
    return createIAMediaItems(
      tapestryId,
      compact(items.map(({ id, mediaType }) => mediaType && { id, mediaType })),
    )
  }

  const { id, metadata } = collectionImport
  return createIAMediaItems(
    tapestryId,
    items.map(({ id: file }) => ({
      id,
      mediaType: metadata.mediatype,
      pathParams: [encodeURIComponent(file)],
    })),
  )
}

function getTitle(imports: CollectionImport[], index: number) {
  const total = imports.length
  const title = COLLECTION_IMPORT_TITLE_MAP[imports[index].type]
  return total > 1 ? `(${index + 1} / ${total}) ${title}` : title
}

export const MAX_SELECTION = 50

export function CollectionImportDialog() {
  const { collectionImports, id: tapestryId } = useTapestryData(['collectionImports', 'id'])
  const dispatch = useDispatch()
  const [selectedItems, setSelectedItems] = useState<ImportItem[]>([])
  const mdOrLess = useResponsive() <= Breakpoint.MD

  const [importIndex, setImportIndex] = useState(0)
  const collectionImport = collectionImports[importIndex] as CollectionImport | undefined

  const { trigger: confirmSelection, loading: creatingItems } = useAsyncAction(async () => {
    if (!collectionImport) {
      return
    }
    dispatch((model) => {
      model.pendingRequests++
    })
    try {
      const viewModels = (await createNewItems(collectionImport, selectedItems, tapestryId)).map(
        createItemViewModel,
      )
      dispatch(viewModels.length > 0 && addAndPositionItems(viewModels))
      onClose()
    } finally {
      dispatch((model) => {
        model.pendingRequests--
      })
    }
  })

  if (!collectionImport) {
    return null
  }

  const onClose = () => {
    setSelectedItems([])
    if (importIndex === collectionImports.length - 1) {
      dispatch(setCollectionImports([]))
      setImportIndex(0)
    } else {
      setImportIndex(importIndex + 1)
    }
  }

  const importDetails = <ImportDetails import={collectionImport} />

  return (
    <SimpleModal
      classes={{ root: clsx(styles.modal, COLLECTION_IMPORT_CLASS_MAP[collectionImport.type]) }}
      title={getTitle(collectionImports, importIndex)}
      cancel={{ onClick: onClose, disabled: creatingItems }}
      confirm={{
        text: creatingItems
          ? 'Saving…'
          : `Save selection${selectedItems.length > 0 ? ` (${selectedItems.length})` : ''}`,
        disabled: selectedItems.length === 0 || creatingItems,
        onClick: confirmSelection,
      }}
    >
      <div className={styles.content}>
        {!mdOrLess && importDetails}
        <ImportItemsList
          onSelect={(item) => setSelectedItems((current) => toggleElement(current, item))}
          onSelectAll={setSelectedItems}
          onDeselectAll={() => setSelectedItems([])}
          selectedItems={selectedItems}
          collectionImport={collectionImport}
          header={mdOrLess && importDetails}
        />
      </div>
    </SimpleModal>
  )
}
