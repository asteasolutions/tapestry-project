import clsx from 'clsx'
import { useRef, useState } from 'react'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { ItemCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { CollectionImport } from '../../pages/tapestry/view-model/index'
import { addAndPositionItems } from '../../pages/tapestry/view-model/store-commands/items'
import { setCollectionImports } from '../../pages/tapestry/view-model/store-commands/tapestry'
import { createItemViewModel } from '../../pages/tapestry/view-model/utils'
import { Breakpoint, useResponsive } from '../../providers/responsive-provider'
import { ImportDetails } from './import-details/index'
import { ImportItemsList } from './import-items-list/index'
import styles from './styles.module.css'

export type CreateItemsFromSelection = () => Promise<ItemCreateDto[]>

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

function getTitle(imports: CollectionImport[], index: number) {
  const total = imports.length
  const title = COLLECTION_IMPORT_TITLE_MAP[imports[index].type]
  return total > 1 ? `(${index + 1} / ${total}) ${title}` : title
}

export const MAX_SELECTION = 50

export function CollectionImportDialog() {
  const { collectionImports, id: tapestryId } = useTapestryData(['collectionImports', 'id'])
  const dispatch = useDispatch()
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const createItemsFromSelectionRef = useRef<CreateItemsFromSelection>(undefined)
  const mdOrLess = useResponsive() <= Breakpoint.MD

  const [importIndex, setImportIndex] = useState(0)
  const collectionImport = collectionImports[importIndex] as CollectionImport | undefined

  const { trigger: confirmSelection, loading: creatingItems } = useAsyncAction(async () => {
    if (!collectionImport || !createItemsFromSelectionRef.current) {
      return
    }
    dispatch((model) => {
      model.pendingRequests++
    })
    try {
      const viewModels = (await createItemsFromSelectionRef.current()).map(createItemViewModel)
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
    setSelectedIndices(new Set())
    if (importIndex === collectionImports.length - 1) {
      dispatch(setCollectionImports([]))
      setImportIndex(0)
    } else {
      setImportIndex(importIndex + 1)
    }
  }

  const importDetails = <ImportDetails import={collectionImport} />
  const selectedCount = selectedIndices.size

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
          selectedIndices={selectedIndices}
          selectItems={(indices) =>
            setSelectedIndices((current) => new Set([...indices, ...current.values()]))
          }
          deselectItem={(index) =>
            setSelectedIndices((current) => {
              const next = new Set(current)
              next.delete(index)
              return next
            })
          }
          deselectAllItems={() => setSelectedIndices(new Set())}
          createItemsFromSelectionRef={createItemsFromSelectionRef}
          tapestryId={tapestryId}
          collectionImport={collectionImport}
          header={mdOrLess && importDetails}
        />
      </div>
    </SimpleModal>
  )
}
