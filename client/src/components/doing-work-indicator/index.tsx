import styles from './styles.module.css'
import { useTapestryData } from '../../pages/tapestry/tapestry-providers'
import DoingWorkSource from '../../assets/gifs/doing-work.gif'

export function DoingWorkIndicator() {
  const pendingRequests = useTapestryData('pendingRequests')
  if (pendingRequests === 0) {
    return null
  }
  return <img src={DoingWorkSource} className={styles.root} />
}
