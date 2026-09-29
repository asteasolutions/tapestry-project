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

export interface IASelectedItem {
  id: string
  mediaType?: IAMediaType
}

export interface OpenverseSelectedItem {
  id: string
  sourceUrl: string
}

export interface WikimediaSelectedItem {
  id: string
  sourceUrl: string
  wikimediaMediaType: WikimediaMediaType
}

export interface PlaylistSelectedItem {
  id: string
}

export type ImportItems =
  | { type: 'IACollection'; itemsData: IASelectedItem[] }
  | { type: 'IASearchCollection'; itemsData: IASelectedItem[] }
  | { type: 'OpenverseCollection'; itemsData: OpenverseSelectedItem[] }
  | { type: 'WikimediaCommonsCategory'; itemsData: WikimediaSelectedItem[] }
  | { type: 'IAPlaylist'; itemsData: PlaylistSelectedItem[] }

type AnySelectedItem = ImportItems['itemsData'][number]

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

async function createNewItems<T extends CollectionImport['type']>(
  collectionImport: CollectionImport,
  items: Extract<ImportItems, { type: T }>['itemsData'],
  tapestryId: string,
) {
  switch (collectionImport.type) {
    case 'OpenverseCollection':
      return createExternalMediaItems(
        tapestryId,
        (items as OpenverseSelectedItem[]).map(({ sourceUrl, id }) => ({
          url: sourceUrl,
          pageUrl: openverseMediaPageURL(collectionImport.mediaType, id),
          mediaType: collectionImport.mediaType,
        })),
      )
    case 'WikimediaCommonsCategory':
      return createExternalMediaItems(
        tapestryId,
        (items as WikimediaSelectedItem[]).map(({ sourceUrl, id, wikimediaMediaType }) => ({
          url: sourceUrl,
          pageUrl: wikimediaFilePageURL(id),
          mediaType: wikimediaMediaType,
        })),
      )
    case 'IACollection':
    case 'IASearchCollection':
      return createIAMediaItems(
        tapestryId,
        compact(
          (items as IASelectedItem[]).map(({ id, mediaType }) => mediaType && { id, mediaType }),
        ),
      )
    case 'IAPlaylist': {
      const { id, metadata } = collectionImport
      return createIAMediaItems(
        tapestryId,
        (items as PlaylistSelectedItem[]).map(({ id: file }) => ({
          id,
          mediaType: metadata.mediatype,
          pathParams: [encodeURIComponent(file)],
        })),
      )
    }
  }
}

function getTitle(imports: CollectionImport[], index: number) {
  const total = imports.length
  const title = COLLECTION_IMPORT_TITLE_MAP[imports[index].type]
  return total > 1 ? `(${index + 1} / ${total}) ${title}` : title
}

export const MAX_SELECTION = 50

// selectedItems is reset to null every time the active collectionImport changes (see onClose), so
// its `type` always agrees with the current collectionImport's type at runtime -- even though
// TypeScript tracks them as two independent values here and downstream in ImportItemsList.
function toggleSelection(
  current: ImportItems | null,
  type: CollectionImport['type'],
  item: AnySelectedItem,
): ImportItems {
  const itemsData = (current?.type === type ? current.itemsData : []) as AnySelectedItem[]
  return { type, itemsData: toggleElement(itemsData, item) } as ImportItems
}

export function CollectionImportDialog() {
  const { collectionImports, id: tapestryId } = useTapestryData(['collectionImports', 'id'])
  const dispatch = useDispatch()
  const [selectedItems, setSelectedItems] = useState<ImportItems | null>(null)
  const mdOrLess = useResponsive() <= Breakpoint.MD

  const [importIndex, setImportIndex] = useState(0)
  const collectionImport = collectionImports[importIndex] as CollectionImport | undefined

  const { trigger: confirmSelection, loading: creatingItems } = useAsyncAction(async () => {
    if (!collectionImport || !selectedItems) {
      return
    }
    const selection = selectedItems
    dispatch((model) => {
      model.pendingRequests++
    })
    try {
      const viewModels = (
        await createNewItems(collectionImport, selection.itemsData, tapestryId)
      ).map(createItemViewModel)
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
    setSelectedItems(null)
    if (importIndex === collectionImports.length - 1) {
      dispatch(setCollectionImports([]))
      setImportIndex(0)
    } else {
      setImportIndex(importIndex + 1)
    }
  }

  const importDetails = <ImportDetails import={collectionImport} />
  const selectedCount = selectedItems?.itemsData.length ?? 0

  return (
    <SimpleModal
      classes={{ root: clsx(styles.modal, COLLECTION_IMPORT_CLASS_MAP[collectionImport.type]) }}
      title={getTitle(collectionImports, importIndex)}
      cancel={{ onClick: onClose, disabled: creatingItems }}
      confirm={{
        text: creatingItems
          ? 'Saving…'
          : `Save selection${selectedCount > 0 ? ` (${selectedCount})` : ''}`,
        disabled: selectedCount === 0 || creatingItems,
        onClick: confirmSelection,
      }}
    >
      <div className={styles.content}>
        {!mdOrLess && importDetails}
        <ImportItemsList
          onSelect={(item) =>
            setSelectedItems((current) => toggleSelection(current, collectionImport.type, item))
          }
          onSelectAll={(itemsData) =>
            setSelectedItems({ type: collectionImport.type, itemsData } as ImportItems)
          }
          onDeselectAll={() => setSelectedItems(null)}
          selectedItems={
            selectedItems?.type === collectionImport.type ? selectedItems.itemsData : []
          }
          collectionImport={collectionImport}
          header={mdOrLess && importDetails}
        />
      </div>
    </SimpleModal>
  )
}
