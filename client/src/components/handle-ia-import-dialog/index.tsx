import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { setIAImport } from '../../pages/tapestry/view-model/store-commands/tapestry'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import styles from './styles.module.css'
import { ImportItemsList } from './import-items-list/index'
import { useState } from 'react'
import { ImportDetails } from './import-details/index'
import { IAImport } from '../../pages/tapestry/view-model/index'
import { createIAItem } from '../../stage/item-factories'
import { IAMediaType } from 'tapestry-core/src/internet-archive'
import { addAndPositionItems } from '../../pages/tapestry/view-model/store-commands/items'
import { createItemViewModel } from '../../pages/tapestry/view-model/utils'
import { compact } from 'lodash-es'
import { Breakpoint, useResponsive } from '../../providers/responsive-provider'
import { toggleElement } from 'tapestry-core/src/lib/array'
import clsx from 'clsx'
import { requestCollectionItems } from './import-items-list/collection-list/index'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'

export interface ImportItem {
  id: string
  mediaType?: IAMediaType
}

const IA_IMPORT_TITLE_MAP: Record<IAImport['type'], string> = {
  IACollection: 'Choose collection items',
  IAPlaylist: 'Choose playlist items',
}

const IA_IMPORT_CLASS_MAP: Record<IAImport['type'], string> = {
  IACollection: styles.collectionList,
  IAPlaylist: styles.playlist,
}

async function createNewItems(
  { type, id, metadata }: IAImport,
  items: ImportItem[],
  tapestryId: string,
) {
  if (type === 'IACollection') {
    return Promise.all(
      compact(
        items.map(({ id, mediaType }) => mediaType && createIAItem(tapestryId, { id, mediaType })),
      ),
    )
  }
  return Promise.all(
    items.map(({ id: filename }) =>
      createIAItem(tapestryId, {
        id,
        mediaType: metadata.mediatype,
        pathParams: [encodeURIComponent(filename)],
      }),
    ),
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
    } else {
      setSelectedItems(
        (await requestCollectionItems(iaImport.id, 0, MAX_SELECTION, signal)).data.map((i) => ({
          id: i.id,
          mediaType: i.mediatype,
        })),
      )
    }
  })

  if (!iaImport) {
    return null
  }

  const onClose = () => {
    setSelectedItems([])
    if (importIndex === iaImports.length - 1) {
      dispatch(setIAImport([]))
    } else {
      setImportIndex(importIndex + 1)
    }
  }

  const header = <ImportDetails import={iaImport} />

  return (
    <SimpleModal
      classes={{ root: clsx(styles.modal, IA_IMPORT_CLASS_MAP[iaImport.type]) }}
      title={getTitle(iaImports, importIndex)}
      cancel={{ onClick: onClose }}
      confirm={{
        text: `Save selection${selectedItems.length > 0 ? ` (${selectedItems.length})` : ''}`,
        disabled: selectedItems.length === 0,
        onClick: async () => {
          const viewModels = (await createNewItems(iaImport, selectedItems, tapestryId)).map(
            createItemViewModel,
          )
          dispatch(viewModels.length > 0 && addAndPositionItems(viewModels))

          onClose()
        },
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
