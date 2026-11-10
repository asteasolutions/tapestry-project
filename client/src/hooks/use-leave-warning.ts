import { useEffect } from 'react'

/**
 * Shows the browser's "Leave site?" warning when the user tries to close or reload the page
 * while `when` is true.
 */
export function useLeaveWarning(when: boolean) {
  useEffect(() => {
    if (!when) {
      return
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when])
}
