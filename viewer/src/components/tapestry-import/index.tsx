import { DragArea } from 'tapestry-core-client/src/components/lib/drag-area'
import { Store } from 'tapestry-core-client/src/lib/store'
import { TapestryViewModel } from 'tapestry-core-client/src/view-model'
import { TYPE } from 'tapestry-core/src/data-format/export'

import { ImportService } from './import-service'

import styles from './styles.module.css'

interface TapestryImportProps {
  onImport: (store: Store<TapestryViewModel>) => unknown
}

export function TapestryImport({ onImport }: TapestryImportProps) {
  return (
    <DragArea
      alwaysVisible
      allowDrop={(items) => items.some((i) => i.type === TYPE)}
      classes={{ root: styles.dragArea, dropArea: styles.dropArea }}
      onDrop={async (e) => {
        const store = await new ImportService().parse(e.dataTransfer.files[0])
        if (!store) {
          return
        }

        onImport(store)
      }}
    />
  )
}
