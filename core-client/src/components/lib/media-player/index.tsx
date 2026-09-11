import { isEqual } from 'lodash-es'
import { useRef, useState, CSSProperties, useMemo } from 'react'
import { usePropRef } from '../hooks/use-prop-ref'
import styles from './styles.module.css'
import { ControlBar } from './control-bar'
import clsx from 'clsx'
import { createPortal } from 'react-dom'
import { Id } from 'tapestry-core/src/data-format/schemas/common'

type ComponentType = 'video' | 'audio'

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
  id: Id
  component: T
  options: VideoJSOptions
  startTime: number
  stopTime?: number
  style?: CSSProperties
  onPlay?: React.ReactEventHandler<HTMLVideoElement | HTMLAudioElement>
  onPause?: React.ReactEventHandler<HTMLVideoElement | HTMLAudioElement>
  onEnded?: React.ReactEventHandler<HTMLVideoElement | HTMLAudioElement>
  onSeeked?: React.ReactEventHandler<HTMLVideoElement | HTMLAudioElement>
  thumbnail?: string
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
  thumbnail,
}: MediaPlayerProps<T>) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null)
  const [volume, setVolume] = useState<number>(1)
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  const isAudio = component === 'audio' || options.audioOnlyMode

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

  const onLoadedMetadata = () => {
    if (!mediaRef.current) {
      return
    }
    mediaRef.current.currentTime = intervalRef.current.startTime
    setDuration(mediaRef.current.duration)
    setIsOver(currentTime === duration)
  }

  const [isPlaying, setIsPlaying] = useState<boolean>(false)

  const handlePlay = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
    setIsPlaying(true)
    onPlay?.(e)
  }

  const handlePause = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
    setIsPlaying(false)
    onPause?.(e)
  }

  const handleEnded = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
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
    let timer: NodeJS.Timeout
    return () => {
      setIsMoving(true)
      clearTimeout(timer)
      timer = setTimeout(() => {
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

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      const fullscreenContainer = portal ?? mediaRef.current?.parentElement
      if (fullscreenContainer) {
        await fullscreenContainer.requestFullscreen()
      }
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

  const portal = document.querySelector(`[data-model-id="${id}"]`)

  return (
    <div
      className={clsx(styles.root, { [styles.audioOnly]: isAudio })}
      style={style}
      onMouseMove={handleMouseMove}
    >
      {isAudio ? (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onSeeked={onSeeked}
          src={options.src}
          style={{ display: 'none' }}
        />
      ) : (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onSeeked={onSeeked}
          controls={false}
          style={{
            display: isPlaying ? 'block' : 'none',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          crossOrigin="anonymous"
        >
          <source src={options.src} type={options.mediaType || 'video/mp4'} />
        </video>
      )}

      {thumbnail && (
        <img
          src={thumbnail}
          // Images that may be loaded via `fetch` elsewhere must always be loaded with CORS policy "anonymous"
          // in order to prevent cached CORS header errors in Chrome.
          crossOrigin="anonymous"
          alt="Video thumbnail"
          style={{
            display: isPlaying ? 'none' : 'block',
            height: '100%',
            width: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />
      )}

      {portal &&
        createPortal(
          <div
            className={styles.controlBar}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <ControlBar
              isOpen={isAudio || isMoving || isHovering || !isPlaying}
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
              toggleFullScreen={isAudio ? undefined : toggleFullscreen}
            />
          </div>,
          portal,
        )}
    </div>
  )
}
