import clsx from 'clsx'
import { Button, IconButton } from '../../buttons'
import { MaybeMenuItem, Toolbar } from '../../toolbar'
import styles from './styles.module.css'
import { CSSProperties, ReactNode, useRef, useState } from 'react'
import { isMobile } from '../../../../lib/user-agent'
import { createPortal } from 'react-dom'

interface ControlBarProps {
  isOpen: boolean
  className?: string
  isPlaying: boolean
  togglePlay: () => void
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  isOver: boolean
  volume: number
  onVolumeChange: (volume: number) => void
  toggleMute: () => void
  playbackRate?: number
  onPlaybackRateChange: (rate: number) => void
  toggleFullScreen: () => void
  isFullscreen: boolean
  mediaId: string
  scale?: number
}

const PLAYBACK_RATES = [4, 2, 1.5, 1, 0.5]

export const CONTROL_BAR_WIDTH = 700

export function ControlBar({
  isOpen = true,
  className,
  isPlaying,
  togglePlay,
  currentTime,
  duration,
  onSeek,
  isOver,
  volume,
  onVolumeChange,
  toggleMute,
  playbackRate = 1,
  onPlaybackRateChange,
  toggleFullScreen,
  isFullscreen,
  mediaId,
  scale,
}: ControlBarProps) {
  function formatTime(seconds: number): string {
    if (isNaN(seconds)) {
      return '00:00'
    }
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const [selectedSubmenu, setSelectedSubmenu] = useState<string>('')

  const selectSubmenu = (id: string) => {
    setSelectedSubmenu((prev) => (prev === id ? '' : id))
  }

  const leaveTimer = useRef<number | null>(null)
  const handleMouseEnter = (id: string) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setSelectedSubmenu(id)
  }

  const handleMouseLeave = () => {
    leaveTimer.current = window.setTimeout(() => {
      setSelectedSubmenu('')
    }, 200)
  }

  const onRateSelect = (rate: number) => {
    onPlaybackRateChange(rate)
    setSelectedSubmenu('')
  }

  const portal = isFullscreen
    ? document.fullscreenElement
    : document.querySelector(`[data-model-id="${mediaId}"]`)

  const isScaled = scale !== undefined && !isFullscreen

  const submenuPortal = (submenu: ReactNode) =>
    portal &&
    createPortal(
      <div
        className={clsx(styles.submenu, { [styles.scaled]: isScaled })}
        style={
          isScaled
            ? ({
                '--control-bar-scale': scale,
                '--control-bar-width': `${CONTROL_BAR_WIDTH}px`,
              } as CSSProperties)
            : undefined
        }
      >
        {submenu}
      </div>,
      portal,
    )

  const volumeSubmenuRef = useRef<HTMLInputElement>(null)
  const playbackRateSubmenuRef = useRef<HTMLDivElement>(null)

  const onFocusOut = (_source: HTMLElement, target: HTMLElement) => {
    if (
      volumeSubmenuRef.current?.contains(target) ||
      playbackRateSubmenuRef.current?.contains(target)
    ) {
      return
    }
    setSelectedSubmenu('')
  }

  const volumeSubmenu = (
    <input
      ref={volumeSubmenuRef}
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={volume}
      onMouseEnter={() => handleMouseEnter('volume')}
      onMouseLeave={handleMouseLeave}
      onChange={(e) => onVolumeChange(Number(e.target.value))}
      className={styles.volumeSlider}
    />
  )

  const playbackRateSubmenu = (
    <div ref={playbackRateSubmenuRef} className={styles.playbackRateButtons}>
      {PLAYBACK_RATES.map((rate) => (
        <Button
          key={rate}
          aria-label={`${rate}x rate`}
          variant="secondary"
          onClick={() => onRateSelect(rate)}
          className={styles.playbackRate}
        >
          {`${rate}x`}
        </Button>
      ))}
    </div>
  )

  const items: MaybeMenuItem[] = [
    {
      element: (
        <IconButton
          icon={isOver ? 'refresh' : isPlaying ? 'pause' : 'play_arrow'}
          aria-label={
            isOver ? 'Replay media button' : isPlaying ? 'Pause media button' : 'Play media button'
          }
          onClick={togglePlay}
        />
      ),
      tooltip: { side: 'top', children: isPlaying ? 'Pause ' : 'Play' },
    },
    !isMobile && {
      id: 'volume',
      ui: {
        element: (
          <IconButton
            icon={volume === 0 ? 'volume_off' : 'volume_up'}
            aria-label="Volume controls"
            onClick={toggleMute}
            onMouseEnter={() => handleMouseEnter('volume')}
            onMouseLeave={handleMouseLeave}
            isActive={selectedSubmenu.startsWith('volume')}
          />
        ),
      },
      direction: 'column',
      submenu: [submenuPortal(volumeSubmenu)],
    },
    <div className={styles.progress}>
      <input
        type="range"
        id="progress"
        min={0}
        max={duration || 0}
        value={currentTime}
        step={0.1}
        onChange={(e) => onSeek(Number(e.target.value))}
        className={styles.progressSlider}
      />
      <span>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>,
    {
      id: 'rate',
      ui: {
        element: (
          <Button
            aria-label="playback rate"
            variant="clear"
            onClick={() => selectSubmenu('rate')}
            isActive={selectedSubmenu.startsWith('rate')}
            className={styles.playbackRate}
          >
            {`${playbackRate}x`}
          </Button>
        ),
        tooltip: { side: 'top', children: 'Playback Rate' },
      },
      direction: 'column',
      submenu: [submenuPortal(playbackRateSubmenu)],
    },
    {
      element: (
        <IconButton
          icon={isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          aria-label={isFullscreen ? 'exit fullscreen' : 'enter fullscreen'}
          onClick={toggleFullScreen}
        />
      ),
      tooltip: {
        side: 'top',
        children: isFullscreen ? 'Exit Fullscreen' : 'Fullscreen',
        align: 'end',
        arrowFollowsAlignment: true,
      },
    },
  ]

  return (
    <Toolbar
      isOpen={isOpen}
      className={clsx(className, styles.root)}
      onFocusOut={onFocusOut}
      selectedSubmenu={selectedSubmenu}
      items={items}
    />
  )
}
