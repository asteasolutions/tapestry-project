import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { StatusSpinner } from '../status-spinner'
import styles from './styles.module.css'

export function SavingIndicator() {
  const pendingRequests = useTapestryData('pendingRequests')

  if (pendingRequests === 0) {
    return null
  }

  return (
    <Text component="div" variant="bodySm" className={styles.root} role="status">
      <StatusSpinner className={styles.spinner} />
      Saving...
    </Text>
  )
}
