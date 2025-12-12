import { useMediaSource } from 'tapestry-core-client/src/components/lib/hooks/use-media-source'
import { TapestryItemProps } from '..'
import { TapestryItem } from '../tapestry-item'

import { memo, useState } from 'react'
import { useMediaEvent } from 'tapestry-core-client/src/components/lib/media-player'

import { useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { AudioItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import Player from 'video.js/dist/types/player'
import { itemUpload } from '../../../../services/item-upload'
import { AudioItemPlayer } from 'tapestry-core-client/src/components/tapestry/items/audio/player'
import { usePlayableItemToolbar } from '../../item-toolbar/use-playable-item-toolbar'

export const AudioItem = memo(({ id }: TapestryItemProps) => {
  const dto = useTapestryData(`items.${id}.dto`) as AudioItemDto
  const src = useMediaSource(dto.source)
  const [duration, setDuration] = useState(0)
  const [player, setPlayer] = useState<Player>()

  const { toolbar } = usePlayableItemToolbar(dto, duration)

  useMediaEvent(player, 'loadedmetadata', (p) => setDuration(p.duration()!))

  return (
    <TapestryItem id={id} halo={toolbar}>
      <AudioItemPlayer id={id} mediaType={itemUpload.type(src)} onPlayerReady={setPlayer} />
    </TapestryItem>
  )
})
