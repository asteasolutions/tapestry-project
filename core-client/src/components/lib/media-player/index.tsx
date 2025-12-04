import { isEqual } from 'lodash-es'
import { useEffect, useRef, useState, CSSProperties } from 'react'
import videojs from 'video.js'
import Player from 'video.js/dist/types/player'
import { usePropRef } from '../hooks/use-prop-ref'
import 'video.js/dist/video-js.css'
import styles from './styles.module.css'

export function useMediaEvent(
  player: Player | undefined,
  event: string,
  callback: (player: Player) => unknown,
) {
  const callbackRef = usePropRef(callback)
  useEffect(() => {
    if (!player) {
      return
    }

    const onEvent = () => callbackRef.current(player)
    player.on(event, onEvent)

    return () => player.off(event, onEvent)
  }, [player, event, callbackRef])
}

export function getVideoElement(player: Player | undefined) {
  return player?.el().querySelector('video')
}

type ComponentType = 'video' | 'audio'

type OnPlayerReady = (player: Player) => unknown

export interface VideoJSOptions {
  autoplay?: boolean | 'muted' | 'play' | 'any'
  src: string
  mediaType?: string
  controls?: boolean
  preload?: 'none' | 'metadata' | 'auto'
  crossorigin?: 'anonymous' | 'use-credentials'
  audioOnlyMode?: boolean
  audioPosterMode?: boolean
  poster?: string
  playbackRates?: number[]
  inactivityTimeout?: number
}

export interface MediaPlayerProps<T extends ComponentType> {
  component: T
  options: VideoJSOptions
  onPlayerReady?: OnPlayerReady
  startTime: number
  stopTime?: number
  style?: CSSProperties
}

export function MediaPlayer<T extends 'video' | 'audio'>({
  component,
  options,
  onPlayerReady,
  startTime,
  stopTime,
  style,
}: MediaPlayerProps<T>) {
  const internalRef = useRef<HTMLDivElement | null>(null)

  const playerRef = useRef<Player>(null)
  const onReadyRef = usePropRef(onPlayerReady)

  const autoStop = useRef(!!stopTime)
  const [currentPlaybackInterval, setCurrentPlaybackInterval] = useState({ startTime, stopTime })
  if (!isEqual(currentPlaybackInterval, { startTime, stopTime })) {
    setCurrentPlaybackInterval({ startTime, stopTime })
    autoStop.current = true
    if (playerRef.current) {
      playerRef.current.currentTime(startTime)
      playerRef.current.pause()
    }
  }

  const intervalRef = usePropRef(currentPlaybackInterval)

  useEffect(() => {
    const { src, mediaType, ...restOptions } = options
    const isVideo = component === 'video'
    const currentOptions = {
      fluid: true,
      audioOnlyMode: !isVideo,
      audioPosterMode: !isVideo,
      playbackRates: [0.5, 1, 1.5, 2, 4],
      ...restOptions,
    }

    if (!playerRef.current) {
      const videoElement = document.createElement('video-js')
      internalRef.current!.appendChild(videoElement)

      const player = videojs(videoElement, currentOptions, () => {
        // It appears that video.js sets the crossorigin attribute after it has set the src.
        // Therefore since we have preload != 'none' when attempting the capture the current
        // video frame when pausing we end up with a security error. That's why the src is
        // set in the ready callback
        player.src({ src, type: mediaType || (isVideo ? 'video/mp4' : 'audio/mpeg') })
        onReadyRef.current?.(player)
      })
      playerRef.current = player
    } else {
      const player = playerRef.current
      // @ts-expect-error VideoJS types leave a lot to be desired
      if (src !== player.src()) {
        player.src({ src, type: mediaType })
      }
      player.options(currentOptions)
      player.poster(currentOptions.poster)
      // From video.js, line 24518: Calling the audioPosterMode method first so that
      // the audioOnlyMode can take precedence when both options are set to true
      void player.audioPosterMode(currentOptions.audioPosterMode)
      void player.audioOnlyMode(currentOptions.audioOnlyMode)
    }
    const player = playerRef.current

    const onTimeUpdate = () => {
      const { startTime, stopTime } = intervalRef.current
      const currentTime = player.currentTime()!
      if (autoStop.current && stopTime && (currentTime >= stopTime || currentTime < startTime)) {
        // If the playback goes outside the interval for any reason (either natural playback or seeking)
        // we are pausing the auto stop functionality
        autoStop.current = false
        // If the playback naturally reached the stop time we pause the video
        if (currentTime >= stopTime && !player.seeking()) {
          player.pause()
        }
      }
    }

    const onLoadedMetadata = () => {
      player.currentTime(intervalRef.current.startTime)
      player.on('timeupdate', onTimeUpdate)
    }
    player.on('loadedmetadata', onLoadedMetadata)

    return () => {
      player.off('timeupdate', onTimeUpdate)
      player.off('loadedmetadata', onLoadedMetadata)
    }
  }, [options, intervalRef, onReadyRef, component])

  return (
    <div data-vjs-player style={{ height: '100%' }}>
      <div ref={internalRef} style={style} className={styles.root} />
    </div>
  )
}
