import { ReactNode, useEffect } from 'react'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { auth } from '../../auth'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { LoadingLogo } from '../../components/loading-logo'

export interface SessionLayoutProps {
  children: ReactNode
}

function init() {
  auth.prepare()
}

export function SessionLayout({ children }: SessionLayoutProps) {
  const { isInitialized } = useObservable(auth)
  useAsync(({ signal }) => auth.refresh(true, signal), [])

  useEffect(() => {
    if (document.readyState === 'complete') {
      init()
    } else {
      window.addEventListener('load', init)
    }

    return () => {
      window.removeEventListener('load', init)
    }
  }, [])

  return isInitialized ? children : <LoadingLogo />
}

export function useSession() {
  return useObservable(auth)
}
