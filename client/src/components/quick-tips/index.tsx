import { useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'

export function QuickTips() {
  const { items, interactionMode } = useTapestryData(['items', 'interactionMode'])
  if (Object.keys(items).length !== 0 || interactionMode === 'view') {
    return null
  }

  return (
    <div className={styles.root}>
      <Text component="div" variant="h6">
        Quick tips
      </Text>
      <div className={styles.contentContainer}>
        <Text component="div" className={styles.title}>
          Copy-Paste
        </Text>
        <Text component="div">links and files on the canvas</Text>
        <Text component="div" className={styles.title} style={{ marginTop: '11px' }}>
          Drag and drop
        </Text>
        <Text component="div">media and files from your computer</Text>

        <hr />

        <div className={styles.tipsContainer}>
          <Icon icon="mouse" filled />
          <Text>Control + Mouse scroll to zoom</Text>
          <Icon icon="pan_tool" filled />
          <Text>Click and drag to move objects</Text>
          <Icon icon="open_with" filled />
          <Text>Space and drag to move canvas</Text>
        </div>
      </div>
    </div>
  )
}
