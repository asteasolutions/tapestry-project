import { useMediaSource } from '../../../lib/hooks/use-media-source'
import { memo, useMemo, useState } from 'react'
import { VideoItem as VideoItemDto } from 'tapestry-core/src/data-format/schemas/item'
import {
  MediaPlayer,
  getVideoElement,
  useMediaEvent,
  VideoJSOptions,
  MediaPlayerProps,
} from '../../../lib/media-player'
import { captureVideoFrame } from '../../../../lib/dom'
import { useMediaParams } from '../../hooks/use-media-params'
import { useAutoplay } from '../../hooks/use-autoplay'
import Player from 'video.js/dist/types/player'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { useTapestryConfig } from '../..'
import { VideoPlayOverlay } from '../../video-play-overlay'

function useVideoThumbnail(dto: VideoItemDto, player: Player | undefined) {
  const [thumbnail, setThumbnail] = useState(dto.customThumbnail ?? dto.thumbnail?.source)

  async function setVideoFrameAsThumb() {
    const video = getVideoElement(player)

    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || dto.customThumbnail) {
      return
    }

    if (thumbnail) {
      URL.revokeObjectURL(thumbnail)
    }
    const blob = await captureVideoFrame(video)
    const url = URL.createObjectURL(blob)
    setThumbnail(url)
  }

  useMediaEvent(player, 'pause', (p) => {
    if (!p.seeking()) {
      void setVideoFrameAsThumb()
    }
  })
  useMediaEvent(player, 'seeked', (p) => {
    if (p.paused()) {
      void setVideoFrameAsThumb()
    }
  })

  return thumbnail
}

export interface VideoItemPlayerProps extends Partial<MediaPlayerProps<'video'>> {
  id: Id
  mediaType?: string
}

export const VideoItemPlayer = memo(
  ({ id, mediaType, style, onPlayerReady, ...playerProps }: VideoItemPlayerProps) => {
    const { useStoreData } = useTapestryConfig()
    const dto = useStoreData(`items.${id}.dto`) as VideoItemDto
    const isInteractive = useStoreData('interactiveElement')?.modelId === id
    const src = useMediaSource(dto.source)
    const [player, setPlayer] = useState<Player>()
    const mediaParams = useMediaParams(id)

    useAutoplay(id, player, mediaParams.autoplay)

    const showVideo = player?.paused() === false || isInteractive

    const thumbnail = useVideoThumbnail(dto, player)

    const options = useMemo<VideoJSOptions>(
      () => ({
        src,
        mediaType,
        controls: true,
        crossorigin: 'anonymous',
        preload: 'metadata',
      }),
      [src, mediaType],
    )

    return (
      <>
        <MediaPlayer
          component="video"
          options={options}
          onPlayerReady={(player) => {
            setPlayer(player)
            onPlayerReady?.(player)
          }}
          startTime={mediaParams.startTime ?? dto.startTime ?? 0}
          stopTime={mediaParams.stopTime ?? dto.stopTime ?? undefined}
          // The video is hidden in order to optimize the Safari layering algorithm
          style={{
            display: showVideo ? 'block' : 'none',
            width: '100%',
            height: '100%',
            ...style,
          }}
          {...playerProps}
        />
        {thumbnail && (
          <img
            src={thumbnail}
            style={{
              display: showVideo ? 'none' : 'block',
              height: '100%',
              width: '100%',
              objectFit: 'cover',
            }}
          />
        )}
        {!isInteractive && player?.paused() && (
          <VideoPlayOverlay itemSize={dto.size} type="play_arrow" />
        )}
      </>
    )
  },
)
