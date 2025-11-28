import { useEffect, useState } from 'react'
import { MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons'

interface FullscreenButtonProps {
  onClick?: () => unknown
}

export function FullscreenButton({ onClick }: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement)

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  return (
    <MenuItemButton
      icon={isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
      aria-label="Toggle fullscreen"
      disabled={!document.fullscreenEnabled}
      onClick={() => {
        void (isFullscreen
          ? document.exitFullscreen()
          : document.documentElement.requestFullscreen({ navigationUI: 'hide' }))
        onClick?.()
      }}
    >
      Toggle Fullscreen
    </MenuItemButton>
  )
}
