import { useEffect } from 'react'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'

export function useLaunchQueue(callback: (files: File[]) => unknown) {
  const callbackRef = usePropRef(callback)

  useEffect(() => {
    if (!window.launchQueue) {
      return
    }
    window.launchQueue.setConsumer(async ({ files: fileHandles }) => {
      const files = await Promise.all(
        fileHandles.reduce<Promise<File>[]>((acc, f) => {
          if (f instanceof FileSystemFileHandle) {
            acc.push(f.getFile())
          }
          return acc
        }, []),
      )
      callbackRef.current(files)
    })
  }, [callbackRef])
}
