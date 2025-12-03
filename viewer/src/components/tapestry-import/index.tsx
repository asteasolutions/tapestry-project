import { DragArea } from 'tapestry-core-client/src/components/lib/drag-area'
import { Store } from 'tapestry-core-client/src/lib/store'
import { TapestryViewModel } from 'tapestry-core-client/src/view-model'
import { TYPE } from 'tapestry-core/src/data-format/export'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'
import { FilePicker } from 'tapestry-core-client/src/components/lib/file-picker'

import { ImportService } from './import-service'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text'

interface TapestryImportProps {
  onImport: (store: Store<TapestryViewModel>) => unknown
}

export function TapestryImport({ onImport }: TapestryImportProps) {
  const handleFile = async (file: File) => {
    const store = await new ImportService().parse(file)
    if (!store) {
      return
    }

    onImport(store)
  }
  return (
    <div className={styles.root}>
      <Text variant="h4">Drop a tapestry zip here</Text>
      <FilePicker accept={TYPE} onChange={handleFile}>
        <Button variant="clear" className={styles.importButton}>
          <DragArea
            alwaysVisible
            allowDrop={(items) => items.some((i) => i.type === TYPE)}
            classes={{ root: styles.dragArea, dropArea: styles.dropArea }}
            onDrop={(e) => handleFile(e.dataTransfer.files[0])}
          ></DragArea>
        </Button>
      </FilePicker>
    </div>
  )
}
