import clsx from 'clsx'
import { Button, IconButton } from '../../buttons'
import { MaybeMenuItem, Toolbar } from '../../toolbar'
import styles from './styles.module.css'
import { useRef, useState } from 'react'
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
  mediaId: string
}

const PLAYBACK_RATES = [4, 2, 1.5, 1, 0.5]

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
  mediaId,
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

  const leaveTimer = useRef<NodeJS.Timeout | null>(null)
  const handleMouseEnter = (id: string) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setSelectedSubmenu(id)
  }

  const handleMouseLeave = () => {
    leaveTimer.current = setTimeout(() => {
      setSelectedSubmenu('')
    }, 200)
  }

  const onRateSelect = (rate: number) => {
    onPlaybackRateChange(rate)
    setSelectedSubmenu('')
  }

  const portal = document.fullscreenElement
    ? (document.fullscreenElement as HTMLElement)
    : document.querySelector(`[data-model-id="${mediaId}"]`)

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
      submenu: [
        portal &&
          createPortal(
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onMouseEnter={() => handleMouseEnter('volume')}
              onMouseLeave={handleMouseLeave}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className={styles.volumeSlider}
            />,
            portal,
          ),
      ],
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
      <span style={{ fontSize: '14px' }}>
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
            onMouseDown={(e) => e.preventDefault()}
            className={styles.playbackRate}
          >
            {`${playbackRate}x`}
          </Button>
        ),
        tooltip: { side: 'top', children: 'Playback Rate' },
      },
      direction: 'column',
      submenu: [
        portal &&
          createPortal(
            <div className={styles.playbackRateButtons}>
              {PLAYBACK_RATES.map((rate) => (
                <Button
                  key={rate}
                  aria-label={`${rate}x rate`}
                  variant="secondary"
                  onClick={() => onRateSelect(rate)}
                  className={styles.playbackRate}
                  style={{ fontSize: '12px' }}
                >
                  {`${rate}x`}
                </Button>
              ))}
            </div>,
            portal,
          ),
      ],
    },
    {
      element: (
        <IconButton
          icon={document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen'}
          aria-label={document.fullscreenElement ? 'exit fullscreen' : 'enter fullscreen'}
          onClick={toggleFullScreen}
        />
      ),
      tooltip: {
        side: 'top',
        children: document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen',
        align: 'end',
        arrowFollowsAlignment: true,
      },
    },
  ]

  return (
    <Toolbar
      isOpen={isOpen}
      className={clsx(className, styles.root)}
      onFocusOut={() => setSelectedSubmenu('')}
      selectedSubmenu={selectedSubmenu}
      items={items}
    />
  )
}
