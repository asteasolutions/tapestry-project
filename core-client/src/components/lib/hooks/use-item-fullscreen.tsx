import { CSSProperties, useEffect, useRef, useState } from 'react'
import { IconButton } from '../buttons/index'
import { SimpleMenuItem } from '../toolbar'

interface UseItemFullscreenOptions {
  exitButtonStyle: CSSProperties
}

export function useItemFullscreen<T extends HTMLElement = HTMLDivElement>({
  exitButtonStyle,
}: UseItemFullscreenOptions) {
  const containerRef = useRef<T>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

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
      style={exitButtonStyle}
      onClick={toggleFullscreen}
    />
  )

  return { containerRef, isFullscreen, fullscreenButton, exitFullscreenButton }
}
