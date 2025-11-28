import { useMediaSource } from 'tapestry-core-client/src/components/lib/hooks/use-media-source'
import { TapestryItemProps } from '..'
import { TapestryItem } from '../tapestry-item'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { memo, useState } from 'react'
import { useMediaEvent } from 'tapestry-core-client/src/components/lib/media-player'
import { TimeInput } from '../../../time-input'
import { useDispatch, useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { AudioItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { updateItem } from '../../../../pages/tapestry/view-model/store-commands/items'
import Player from 'video.js/dist/types/player'
import { itemUpload } from '../../../../services/item-upload'
import { AudioItemPlayer } from 'tapestry-core-client/src/components/tapestry/items/audio/player'

export const AudioItem = memo(({ id }: TapestryItemProps) => {
  const { startTime, source, stopTime } = useTapestryData(`items.${id}.dto`) as AudioItemDto
  const dispatch = useDispatch()
  const src = useMediaSource(source)
  const [duration, setDuration] = useState(0)
  const [player, setPlayer] = useState<Player>()

  const { toolbar } = useItemToolbar(id, {
    moreMenuItems: duration
      ? [
          <TimeInput
            onChange={(value) => dispatch(updateItem(id, { dto: { startTime: value } }))}
            text="Audio start at"
            value={startTime ?? null}
            max={stopTime ?? duration}
          />,
          <TimeInput
            onChange={(value) => dispatch(updateItem(id, { dto: { stopTime: value } }))}
            text="Audio stop at"
            value={stopTime ?? null}
            min={startTime ?? 0}
            max={duration}
          />,
        ]
      : undefined,
  })

  useMediaEvent(player, 'loadedmetadata', (p) => setDuration(p.duration()!))

  return (
    <TapestryItem id={id} halo={toolbar}>
      <AudioItemPlayer id={id} mediaType={itemUpload.type(src)} onPlayerReady={setPlayer} />
    </TapestryItem>
  )
})
