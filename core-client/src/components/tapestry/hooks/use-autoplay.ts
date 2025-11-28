import Player from 'video.js/dist/types/player'
import { useEffect } from 'react'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { useTapestryConfig } from '..'

export function useAutoplay(id: Id, player: Player | undefined, autoplay: boolean | undefined) {
  const { useStoreData } = useTapestryConfig()
  const isInteractive = useStoreData('interactiveElement.modelId') === id

  useEffect(() => {
    if (isInteractive && autoplay) {
      void player?.play()
    }
  }, [isInteractive, autoplay, player])
}
