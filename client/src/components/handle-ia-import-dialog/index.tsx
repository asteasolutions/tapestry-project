import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import {
  setInteractiveElement,
  setIAImport,
} from '../../pages/tapestry/view-model/store-commands/tapestry'
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

export const MAX_SELECTION = 50

export function HandleIAImportDialog() {
  const { iaImport, id: tapestryId } = useTapestryData(['iaImport', 'id'])
  const dispatch = useDispatch()
  const [selectedItems, setSelectedItems] = useState<ImportItem[]>([])
  const mdOrLess = useResponsive() <= Breakpoint.MD

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
    dispatch(setIAImport(null))
  }

  const header = <ImportDetails import={iaImport} />

  return (
    <SimpleModal
      classes={{ root: clsx(styles.modal, IA_IMPORT_CLASS_MAP[iaImport.type]) }}
      title={IA_IMPORT_TITLE_MAP[iaImport.type]}
      cancel={{ onClick: onClose }}
      confirm={{
        text: `Save selection${selectedItems.length > 0 ? ` (${selectedItems.length})` : ''}`,
        disabled: selectedItems.length === 0,
        onClick: async () => {
          const viewModels = (await createNewItems(iaImport, selectedItems, tapestryId)).map(
            createItemViewModel,
          )

          dispatch(
            viewModels.length !== 0 && addAndPositionItems(viewModels),
            viewModels.length === 1 &&
              setInteractiveElement({ modelId: viewModels[0].dto.id, modelType: 'item' }),
          )

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
