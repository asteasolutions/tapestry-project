import { isEqual } from 'lodash-es'
import { useRef, useState, CSSProperties, useMemo, useEffect } from 'react'
import { usePropRef } from '../hooks/use-prop-ref'
import styles from './styles.module.css'
import { CONTROL_BAR_WIDTH, ControlBar } from './control-bar'
import clsx from 'clsx'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { Icon } from '../icon'
import { Size } from 'tapestry-core/src/lib/geometry'
import { getItemOverlayScale } from '../../../view-model/utils'

type ComponentType = 'video' | 'audio'
type MediaElement<T extends ComponentType> = T extends 'video' ? HTMLVideoElement : HTMLAudioElement
type MediaEvent<T extends ComponentType> = React.SyntheticEvent<MediaElement<T>>

export interface MediaOptions {
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

export interface MediaPlayerProps<T extends ComponentType, Component = MediaElement<T>> {
  id: Id
  component: T
  options: MediaOptions
  startTime: number
  stopTime?: number
  style?: CSSProperties
  onPlay?: React.ReactEventHandler<Component>
  onPause?: (event: React.SyntheticEvent<Component>) => void | Promise<void>
  onEnded?: React.ReactEventHandler<Component>
  onSeeked?: React.ReactEventHandler<Component>
  onLoadedMetadata?: React.ReactEventHandler<Component>
  isInteractive: boolean
  thumbnail?: string
  size?: Size
}

export function MediaPlayer<T extends 'video' | 'audio'>({
  id,
  component,
  options,
  startTime,
  stopTime,
  style,
  onPlay,
  onPause,
  onEnded,
  onSeeked,
  onLoadedMetadata,
  isInteractive,
  thumbnail,
  size,
}: MediaPlayerProps<T>) {
  const mediaRef = useRef<MediaElement<T> | null>(null)
  const [volume, setVolume] = useState<number>(1)
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  const isAudio = component === 'audio' || options.audioOnlyMode
  const controlBarScale = !isAudio && size ? Math.max(size.width / CONTROL_BAR_WIDTH, 1) : undefined

  const autoStop = useRef(!!stopTime)
  const [currentPlaybackInterval, setCurrentPlaybackInterval] = useState({ startTime, stopTime })
  const intervalRef = usePropRef(currentPlaybackInterval)

  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [isOver, setIsOver] = useState<boolean>(false)

  const [isMoving, setIsMoving] = useState<boolean>(false)
  const [isHovering, setIsHovering] = useState<boolean>(false)

  if (!isEqual(currentPlaybackInterval, { startTime, stopTime })) {
    setCurrentPlaybackInterval({ startTime, stopTime })
    autoStop.current = true
    if (mediaRef.current) {
      mediaRef.current.currentTime = startTime
      mediaRef.current.pause()
    }
  }

  const onTimeUpdate = () => {
    if (!mediaRef.current) {
      return
    }

    const { startTime, stopTime } = intervalRef.current
    const currentTime = mediaRef.current.currentTime
    if (autoStop.current && stopTime && (currentTime >= stopTime || currentTime < startTime)) {
      // If the playback goes outside the interval for any reason (either natural playback or seeking)
      // we are pausing the auto stop functionality
      autoStop.current = false
      // If the playback naturally reached the stop time we pause the video
      if (currentTime >= stopTime && !mediaRef.current.seeking) {
        mediaRef.current.pause()
      }
    }

    setCurrentTime(currentTime)
    setIsOver(currentTime === duration)
  }

  const handleLoadedMetadata = (e: MediaEvent<T>) => {
    if (!mediaRef.current) {
      return
    }
    mediaRef.current.currentTime = intervalRef.current.startTime
    setDuration(mediaRef.current.duration)
    setIsOver(currentTime === duration)
    onLoadedMetadata?.(e)
  }

  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [hasPlayed, setHasPlayed] = useState<boolean>(false)
  const [isPausing, setIsPausing] = useState<boolean>(false)
  const [loadedThumbnail, setLoadedThumbnail] = useState<string>()

  const isThumbnailReady = !thumbnail || loadedThumbnail === thumbnail
  const isVideoVisible = isPlaying || isPausing || (hasPlayed && !isThumbnailReady)

  const handlePlay = (e: MediaEvent<T>) => {
    setIsPlaying(true)
    setHasPlayed(true)
    onPlay?.(e)
  }

  const handlePause = async (e: MediaEvent<T>) => {
    setIsPlaying(false)
    setIsPausing(true)
    await onPause?.(e)
    setIsPausing(false)
  }

  const handleEnded = (e: MediaEvent<T>) => {
    setIsPlaying(false)
    onEnded?.(e)
  }

  const togglePlay = async () => {
    if (!mediaRef.current) {
      return
    }

    if (mediaRef.current.paused) {
      await mediaRef.current.play()
    } else {
      mediaRef.current.pause()
    }
  }

  const onSeek = (time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time
      setCurrentTime(time)
      setIsOver(currentTime === duration)
    }
  }

  const handleMouseMove = useMemo(() => {
    let timer: number
    return () => {
      setIsMoving(true)
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        setIsMoving(false)
      }, 3000)
    }
  }, [])

  const onVolumeChange = (newVolume: number) => {
    if (mediaRef.current) {
      mediaRef.current.volume = newVolume
      mediaRef.current.muted = newVolume === 0
      setVolume(newVolume)
    }
  }

  const onPlaybackRateChange = (newRate: number) => {
    if (mediaRef.current) {
      mediaRef.current.playbackRate = newRate
      setPlaybackRate(newRate)
    }
  }

  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreenContainer = mediaRef.current?.parentElement
      setIsFullscreen(!!fullscreenContainer && document.fullscreenElement === fullscreenContainer)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [mediaRef])

  const toggleFullscreen = async () => {
    const fullscreenContainer = mediaRef.current?.parentElement
    if (!fullscreenContainer) return

    if (document.fullscreenElement === fullscreenContainer) {
      await document.exitFullscreen()
    } else {
      await fullscreenContainer.requestFullscreen()
    }
  }

  const previousVolumeRef = useRef<number>(1)
  const toggleMute = () => {
    if (volume > 0) {
      previousVolumeRef.current = volume
      onVolumeChange(0)
    } else {
      onVolumeChange(previousVolumeRef.current > 0 ? previousVolumeRef.current : 1)
    }
  }

  const mediaProps = {
    onLoadedMetadata: handleLoadedMetadata,
    onTimeUpdate: onTimeUpdate,
    onPlay: handlePlay,
    onPause: (e: MediaEvent<T>) => void handlePause(e),
    onEnded: handleEnded,
    onSeeked: onSeeked,
  }

  return (
    <div
      className={clsx(styles.root, { [styles.audioOnly]: isAudio })}
      style={style}
      onMouseMove={handleMouseMove}
    >
      {isAudio ? (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          {...mediaProps}
          src={options.src}
          style={{ display: 'none' }}
        />
      ) : (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          {...mediaProps}
          controls={false}
          style={{
            display: isVideoVisible ? 'block' : 'none',
            width: '100%',
            height: '100%',
          }}
          className={styles.video}
          crossOrigin="anonymous"
        >
          <source src={options.src} type={options.mediaType || 'video/mp4'} />
        </video>
      )}
      {thumbnail && (
        <img
          src={thumbnail}
          onLoad={() => setLoadedThumbnail(thumbnail)}
          onError={() => setLoadedThumbnail(thumbnail)}
          // Images that may be loaded via `fetch` elsewhere must always be loaded with CORS policy "anonymous"
          // in order to prevent cached CORS header errors in Chrome.
          crossOrigin="anonymous"
          alt="Video thumbnail"
          style={{
            display: isVideoVisible && !isAudio ? 'none' : 'block',
            height: '100%',
            width: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />
      )}
      {!isAudio && isInteractive && (
        <div className={styles.playArea} onClick={() => void togglePlay()}>
          {!isPlaying && (
            <div
              className={styles.playButton}
              style={{ transform: size ? `scale(${getItemOverlayScale(size)})` : undefined }}
            >
              <Icon icon="play_arrow" filled />
            </div>
          )}
        </div>
      )}
      <div
        className={styles.controlBar}
        style={
          controlBarScale !== undefined
            ? ({
                '--control-bar-scale': controlBarScale,
                '--control-bar-width': `${CONTROL_BAR_WIDTH}px`,
              } as CSSProperties)
            : undefined
        }
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <ControlBar
          isOpen={isAudio || (isInteractive && (isMoving || isHovering || !isPlaying))}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          currentTime={currentTime}
          duration={duration}
          isOver={isOver}
          onSeek={onSeek}
          volume={volume}
          onVolumeChange={onVolumeChange}
          toggleMute={toggleMute}
          playbackRate={playbackRate}
          onPlaybackRateChange={onPlaybackRateChange}
          toggleFullScreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          mediaId={id}
          scale={controlBarScale}
        />
      </div>
    </div>
  )
}
