import Logo from 'tapestry-core-client/src/assets/icons/logo.svg?react'
import { DropArea } from 'tapestry-core-client/src/components/lib/drop-area'
import { FilePicker } from 'tapestry-core-client/src/components/lib/file-picker'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon'
import { Text } from 'tapestry-core-client/src/components/lib/text'
import { Store } from 'tapestry-core-client/src/lib/store'
import { TapestryViewModel } from 'tapestry-core-client/src/view-model'
import { TYPE } from 'tapestry-core/src/data-format/export'
import { ImportService } from './import-service'
import styles from './styles.module.css'

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
      <div className={styles.header}>
        <SvgIcon Icon={Logo} width={150} className={styles.logo} />
        <Text className={styles.title}>Tapestry Viewer</Text>
      </div>
      <FilePicker accept={TYPE} onChange={handleFile}>
        <DropArea
          alwaysVisible
          allowDrop={(items) => items.some((i) => i.type === TYPE)}
          onDrop={(e) => handleFile(e.dataTransfer.files[0])}
          title="Load Tapestry"
          subtitle="Drop a Tapestry ZIP here"
        />
      </FilePicker>
    </div>
  )
}
