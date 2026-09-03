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
import { IAImport } from '../../pages/tapestry/view-model/index'
import { addAndPositionItems } from '../../pages/tapestry/view-model/store-commands/items'
import { setIAImport } from '../../pages/tapestry/view-model/store-commands/tapestry'
import { createItemViewModel } from '../../pages/tapestry/view-model/utils'
import { Breakpoint, useResponsive } from '../../providers/responsive-provider'
import {
  fetchOpenverseCollectionResults,
  fetchWikimediaCollectionResults,
} from '../../lib/external-media'
import { createIAMediaItems, createExternalMediaItems } from '../../stage/item-factories'
import { ImportDetails } from './import-details/index'
import { requestCollectionItems } from './import-items-list/collection-list/index'
import { ImportItemsList } from './import-items-list/index'
import styles from './styles.module.css'

export interface ImportItem {
  id: string
  mediaType?: IAMediaType
  sourceUrl?: string
  wikimediaMediaType?: WikimediaMediaType
}

const IA_IMPORT_TITLE_MAP: Record<IAImport['type'], string> = {
  IACollection: 'Choose collection items',
  IAPlaylist: 'Choose playlist items',
  ExternalCollection: 'Choose items to import',
}

const IA_IMPORT_CLASS_MAP: Record<IAImport['type'], string> = {
  IACollection: styles.collectionList,
  IAPlaylist: styles.playlist,
  ExternalCollection: styles.collectionList,
}

async function createNewItems(iaImport: IAImport, items: ImportItem[], tapestryId: string) {
  if (iaImport.type === 'ExternalCollection') {
    if (iaImport.platform === 'openverse') {
      const { mediaType } = iaImport
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

  const {
    type,
    id,
    metadata: { mediatype: mediaType },
  } = iaImport

  if (type === 'IACollection') {
    return createIAMediaItems(
      tapestryId,
      compact(items.map(({ id, mediaType }) => mediaType && { id, mediaType })),
    )
  }

  return createIAMediaItems(
    tapestryId,
    items.map(({ id: file }) => ({ id, mediaType, pathParams: [encodeURIComponent(file)] })),
  )
}

function getTitle(imports: IAImport[], index: number) {
  const total = imports.length
  const title = IA_IMPORT_TITLE_MAP[imports[index].type]
  return total > 1 ? `(${index + 1} / ${total}) ${title}` : title
}

export const MAX_SELECTION = 50

export function HandleIAImportDialog() {
  const { iaImports, id: tapestryId } = useTapestryData(['iaImports', 'id'])
  const dispatch = useDispatch()
  const [selectedItems, setSelectedItems] = useState<ImportItem[]>([])
  const mdOrLess = useResponsive() <= Breakpoint.MD

  const [importIndex, setImportIndex] = useState(0)
  const iaImport = iaImports[importIndex] as IAImport | undefined

  const { trigger: toggleAll, loading } = useAsyncAction(async ({ signal }, check: boolean) => {
    if (!iaImport) {
      return
    }
    if (!check) {
      setSelectedItems([])
      return
    }

    if (iaImport.type === 'IAPlaylist') {
      setSelectedItems(iaImport.entries.slice(0, MAX_SELECTION).map((e) => ({ id: e.filename })))
    } else if (iaImport.type === 'ExternalCollection' && iaImport.platform === 'openverse') {
      const results = await fetchOpenverseCollectionResults(
        iaImport.mediaType,
        iaImport.collection,
        1,
        MAX_SELECTION,
        signal,
      )
      setSelectedItems(
        (results?.results ?? []).map((media) => ({ id: media.id, sourceUrl: media.url })),
      )
    } else if (iaImport.type === 'ExternalCollection') {
      const results = await fetchWikimediaCollectionResults(
        iaImport.collection,
        1,
        MAX_SELECTION,
        signal,
      )
      setSelectedItems(
        (results?.results ?? []).map((media) => ({
          id: media.id,
          sourceUrl: media.url,
          wikimediaMediaType: media.mediaType,
        })),
      )
    } else {
      setSelectedItems(
        (await requestCollectionItems(iaImport.id, 0, MAX_SELECTION, signal)).data.map((i) => ({
          id: i.id,
          mediaType: i.mediatype,
        })),
      )
    }
  })

  const { trigger: confirmSelection, loading: creatingItems } = useAsyncAction(async () => {
    if (!iaImport) {
      return
    }
    dispatch((model) => {
      model.pendingRequests++
    })
    try {
      const viewModels = (await createNewItems(iaImport, selectedItems, tapestryId)).map(
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

  if (!iaImport) {
    return null
  }

  const onClose = () => {
    setSelectedItems([])
    if (importIndex === iaImports.length - 1) {
      dispatch(setIAImport([]))
      setImportIndex(0)
    } else {
      setImportIndex(importIndex + 1)
    }
  }

  const header = <ImportDetails import={iaImport} />

  return (
    <SimpleModal
      classes={{ root: clsx(styles.modal, IA_IMPORT_CLASS_MAP[iaImport.type]) }}
      title={getTitle(iaImports, importIndex)}
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
        {!mdOrLess && header}
        <ImportItemsList
          onSelect={(item) => setSelectedItems((current) => toggleElement(current, item))}
          onToggleAll={toggleAll}
          toggling={loading}
          selectedItems={selectedItems}
          iaImport={iaImport}
          header={mdOrLess && header}
        />
      </div>
    </SimpleModal>
  )
}
