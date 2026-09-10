import { isEqual } from 'lodash-es'
import { useEffect, useRef, useState, CSSProperties, useMemo } from 'react'
import Player from 'video.js/dist/types/player'
import { usePropRef } from '../hooks/use-prop-ref'
import 'video.js/dist/video-js.css'
import styles from './styles.module.css'
import { ControlBar } from './control-bar'
import clsx from 'clsx'

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
  startTime: number
  stopTime?: number
  style?: CSSProperties
  onPlay?: React.ReactEventHandler<HTMLVideoElement | HTMLAudioElement>
  onPause?: React.ReactEventHandler<HTMLVideoElement | HTMLAudioElement>
  onEnded?: React.ReactEventHandler<HTMLVideoElement | HTMLAudioElement>
  onSeeked?: React.ReactEventHandler<HTMLVideoElement | HTMLAudioElement>
}

export function MediaPlayer<T extends 'video' | 'audio'>({
  component,
  options,
  startTime,
  stopTime,
  style,
  onPlay,
  onPause,
  onEnded,
  onSeeked,
}: MediaPlayerProps<T>) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
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
    if (videoRef.current) {
      videoRef.current.currentTime = startTime
      videoRef.current.pause()
    }
  }

  const onTimeUpdate = () => {
    if (!videoRef.current) {
      return
    }

    const { startTime, stopTime } = intervalRef.current
    const currentTime = videoRef.current.currentTime
    if (autoStop.current && stopTime && (currentTime >= stopTime || currentTime < startTime)) {
      // If the playback goes outside the interval for any reason (either natural playback or seeking)
      // we are pausing the auto stop functionality
      autoStop.current = false
      // If the playback naturally reached the stop time we pause the video
      if (currentTime >= stopTime && !videoRef.current.seeking) {
        videoRef.current.pause()
      }
    }

    setCurrentTime(currentTime)
    setIsOver(currentTime === duration)
  }

  const onLoadedMetadata = () => {
    if (!videoRef.current) {
      return
    }
    videoRef.current.currentTime = intervalRef.current.startTime
    setDuration(videoRef.current.duration)
    setIsOver(currentTime === duration)
  }

  const [isPlaying, setIsPlaying] = useState<boolean>(false)

  const togglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const onSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
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
      }, 300000)
    }
  }, [])

  const onVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      videoRef.current.muted = newVolume === 0
      setVolume(newVolume)
    }
  }

  const onPlaybackRateChange = (newRate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate
      setPlaybackRate(newRate)
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        if (videoRef.current.requestFullscreen) {
          videoRef.current.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
      }
    }
  }

  return (
    <div
      className={clsx(styles.root, { [styles.audioOnly]: isAudio })}
      style={style}
      onMouseMove={handleMouseMove}
    >
      {isAudio ? (
        <audio
          ref={videoRef}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onSeeked={onSeeked}
          src={options.src}
          style={{ display: 'none' }}
        />
      ) : (
        <video
          ref={videoRef}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onSeeked={onSeeked}
          controls={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        >
          <source src={options.src} type={options.mediaType || 'video/mp4'} />
        </video>
      )}

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
          playbackRate={playbackRate}
          onPlaybackRateChange={onPlaybackRateChange}
          toggleFullScreen={isAudio ? undefined : toggleFullscreen}
        />
      </div>
    </div>
  )
}
