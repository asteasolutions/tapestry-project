import { useMediaSource } from '../../../lib/hooks/use-media-source'
import { memo, useMemo, useState } from 'react'
import { AudioItem as AudioItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { MediaPlayer, MediaPlayerProps, VideoJSOptions } from '../../../lib/media-player'
import { useTapestryConfig } from '../..'
import { useMediaParams } from '../../hooks/use-media-params'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { useAutoplay } from '../../hooks/use-autoplay'
import Player from 'video.js/dist/types/player'

export interface AudioItemPlayerProps extends Partial<MediaPlayerProps<'audio'>> {
  id: Id
  mediaType?: string
}

export const AudioItemPlayer = memo(
  ({ id, mediaType, style, onPlayerReady, ...playerProps }: AudioItemPlayerProps) => {
    const { useStoreData } = useTapestryConfig()
    const { startTime, source, stopTime, customThumbnail } = useStoreData(
      `items.${id}.dto`,
    ) as AudioItemDto
    const src = useMediaSource(source)
    const mediaParams = useMediaParams(id)
    const [player, setPlayer] = useState<Player>()

    useAutoplay(id, player, mediaParams.autoplay)

    const options = useMemo<VideoJSOptions>(
      () => ({
        src,
        mediaType,
        controls: true,
        inactivityTimeout: 0,
        ...(customThumbnail ? { poster: customThumbnail, audioOnlyMode: false } : {}),
      }),
      [src, mediaType, customThumbnail],
    )

    return (
      <MediaPlayer
        component="audio"
        options={options}
        onPlayerReady={(player) => {
          setPlayer(player)
          onPlayerReady?.(player)
        }}
        startTime={mediaParams.startTime ?? startTime ?? 0}
        stopTime={mediaParams.stopTime ?? stopTime ?? undefined}
        style={{ display: 'block', width: '100%', height: '100%', ...style }}
        {...playerProps}
      />
    )
  },
)
