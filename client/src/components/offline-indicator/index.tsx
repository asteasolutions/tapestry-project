import clsx from 'clsx'
import styles from './styles.module.css'
import { useDispatch } from '../../pages/tapestry/tapestry-providers'
import { setSnackbar } from '../../pages/tapestry/view-model/store-commands/tapestry'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { useOnline } from '../../services/api'
import { usePrevious } from 'tapestry-core-client/src/components/lib/hooks/use-previous'
import { useEffect } from 'react'

interface OfflineIndicatorProps {
  className?: string
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const online = useOnline()
  const dispatch = useDispatch()

  const wasOnline = usePrevious(online)

  useEffect(() => {
    if (online === 'online' && wasOnline === 'online') {
      return
    }
    dispatch(
      setSnackbar(
        online === 'online'
          ? { text: 'You are back online', variant: 'success' }
          : {
              text: wasOnline === 'online' ? 'Connection lost' : 'No connection',
              variant: 'error',
            },
      ),
    )
  }, [dispatch, online, wasOnline])

  return online !== 'offline' ? null : (
    <Icon icon="wifi_off" className={clsx(styles.root, className)} />
  )
}
