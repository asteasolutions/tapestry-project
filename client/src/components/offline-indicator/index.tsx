import clsx from 'clsx'
import styles from './styles.module.css'
import { useEffect, useState } from 'react'
import { useDispatch } from '../../pages/tapestry/tapestry-providers'
import { setSnackbar } from '../../pages/tapestry/view-model/store-commands/tapestry'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'

interface OfflineIndicatorProps {
  className?: string
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [offline, setOffline] = useState(!navigator.onLine)
  const dispatch = useDispatch()

  useEffect(() => {
    const onConnectionChanged = () => {
      setOffline(!navigator.onLine)
      dispatch(
        setSnackbar(
          navigator.onLine
            ? { text: 'You are back online', variant: 'success' }
            : { text: 'Connection lost', variant: 'error' },
        ),
      )
    }

    window.addEventListener('online', onConnectionChanged)
    window.addEventListener('offline', onConnectionChanged)

    return () => {
      window.removeEventListener('online', onConnectionChanged)
      window.removeEventListener('offline', onConnectionChanged)
    }
  }, [dispatch])

  return offline ? <Icon icon="wifi_off" className={clsx(styles.root, className)} /> : null
}
