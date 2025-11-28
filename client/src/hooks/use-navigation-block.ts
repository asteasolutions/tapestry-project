import { useEffect } from 'react'
import { BlockerFunction, useBlocker } from 'react-router'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'

export type BlockerFn = (arg?: Parameters<BlockerFunction>[0]) => boolean

export function useNavigationBlock(blockerFn: BlockerFn) {
  const blocker = useBlocker(blockerFn)
  const blockerFnRef = usePropRef(blockerFn)

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (blockerFnRef.current()) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [blockerFnRef])

  return blocker
}
