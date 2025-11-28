import { useMediaSource } from 'tapestry-core-client/src/components/lib/hooks/use-media-source'
import { TapestryItemProps } from '..'
import { TapestryItem } from '../tapestry-item'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { memo, useState } from 'react'
import { VideoItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TimeInput } from '../../../time-input'
import { useMediaEvent } from 'tapestry-core-client/src/components/lib/media-player'
import { useDispatch, useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { updateItem } from '../../../../pages/tapestry/view-model/store-commands/items'
import Player from 'video.js/dist/types/player'
import { itemUpload } from '../../../../services/item-upload'
import { VideoItemPlayer } from 'tapestry-core-client/src/components/tapestry/items/video/player'

export const VideoItem = memo(({ id }: TapestryItemProps) => {
  const { startTime, source, stopTime } = useTapestryData(`items.${id}.dto`) as VideoItemDto
  const dispatch = useDispatch()
  const src = useMediaSource(source)
  const [duration, setDuration] = useState(0)
  const [player, setPlayer] = useState<Player>()

  const { toolbar } = useItemToolbar(id, {
    moreMenuItems: duration
      ? [
          <TimeInput
            onChange={(value) => dispatch(updateItem(id, { dto: { startTime: value } }))}
            text="Video start at"
            value={startTime ?? null}
            max={stopTime ?? duration}
          />,
          <TimeInput
            onChange={(value) => dispatch(updateItem(id, { dto: { stopTime: value } }))}
            text="Video stop at"
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
      <VideoItemPlayer id={id} mediaType={itemUpload.type(src)} onPlayerReady={setPlayer} />
    </TapestryItem>
  )
})
