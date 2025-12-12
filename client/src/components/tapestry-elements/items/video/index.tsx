import { useMediaSource } from 'tapestry-core-client/src/components/lib/hooks/use-media-source'
import { TapestryItemProps } from '..'
import { TapestryItem } from '../tapestry-item'
import { memo, useState } from 'react'
import { VideoItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { useMediaEvent } from 'tapestry-core-client/src/components/lib/media-player'
import { useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import Player from 'video.js/dist/types/player'
import { itemUpload } from '../../../../services/item-upload'
import { VideoItemPlayer } from 'tapestry-core-client/src/components/tapestry/items/video/player'
import { usePlayableItemToolbar } from '../../item-toolbar/use-playable-item-toolbar'

export const VideoItem = memo(({ id }: TapestryItemProps) => {
  const dto = useTapestryData(`items.${id}.dto`) as VideoItemDto
  const src = useMediaSource(dto.source)
  const [duration, setDuration] = useState(0)
  const [player, setPlayer] = useState<Player>()

  const { toolbar } = usePlayableItemToolbar(dto, duration)

  useMediaEvent(player, 'loadedmetadata', (p) => setDuration(p.duration()!))

  return (
    <TapestryItem id={id} halo={toolbar}>
      <VideoItemPlayer id={id} mediaType={itemUpload.type(src)} onPlayerReady={setPlayer} />
    </TapestryItem>
  )
})
