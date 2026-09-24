import { useEffect, useState, type RefObject } from 'react'
import { IconButton } from '../buttons/index'
import { SimpleMenuItem } from '../toolbar'

export function useItemFullscreen(containerRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [containerRef])

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (document.fullscreenElement === containerRef.current) {
      void document.exitFullscreen()
    } else {
      void containerRef.current.requestFullscreen()
    }
  }

  const fullscreenButton: SimpleMenuItem = {
    element: (
      <IconButton icon="open_in_full" aria-label="Enter fullscreen" onClick={toggleFullscreen} />
    ),
    tooltip: { side: 'bottom', children: 'Fullscreen' },
  }

  const exitFullscreenButton = (
    <IconButton
      icon="close_fullscreen"
      aria-label="Exit fullscreen"
      style={{ position: 'absolute', top: 16, right: 16 }}
      onClick={toggleFullscreen}
    />
  )

  return { isFullscreen, fullscreenButton, exitFullscreenButton }
}
