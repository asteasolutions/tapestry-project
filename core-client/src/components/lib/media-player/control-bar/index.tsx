import clsx from 'clsx'
import { Button, IconButton } from '../../buttons'
import { MaybeMenuItem, Toolbar } from '../../toolbar'
import styles from './styles.module.css'
import { useState } from 'react'

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
  toggleFullScreen?: () => void
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

  const onRateSelect = (rate: number) => {
    onPlaybackRateChange(rate)
    setSelectedSubmenu('')
  }

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
    {
      id: 'volume',
      ui: {
        element: (
          <IconButton
            icon={volume === 0 ? 'volume_off' : 'volume_up'}
            aria-label="Volume controls"
            onClick={toggleMute}
            onMouseEnter={() => selectSubmenu('volume')}
            onMouseLeave={() => selectSubmenu('')}
            isActive={selectedSubmenu.startsWith('volume')}
          />
        ),
        tooltip: { side: 'top', children: 'Volume' },
      },
      direction: 'column',
      submenu: [
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onMouseEnter={() => selectSubmenu('volume')}
          onMouseLeave={() => selectSubmenu('')}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className={styles.volumeSlider}
        />,
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
            className={styles.playbackRate}
          >
            {`${playbackRate}x`}
          </Button>
        ),
        tooltip: { side: 'top', children: 'Playback Rate' },
      },
      direction: 'column',
      submenu: [
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
      ],
    },
  ]

  if (toggleFullScreen) {
    items.push({
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
      },
    })
  }

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
