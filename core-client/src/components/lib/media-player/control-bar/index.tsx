import clsx from 'clsx'
import { IconButton } from '../../buttons'
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
}
export function ControlBar({
  isOpen = true,
  className,
  isPlaying,
  togglePlay,
  currentTime,
  duration,
  onSeek,
  isOver,
}: ControlBarProps) {
  function formatTime(seconds: number): string {
    if (isNaN(seconds)) {
      return '00:00'
    }
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const slide = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(e.target.value))
  }

  const [selectedSubmenu, setSelectedSubmenu] = useState<string>('')

  const selectSubmenu = (id: string) => {
    setSelectedSubmenu((prev) => (prev === id ? '' : id))
  }

  const closeSubmenu = () => {
    setSelectedSubmenu('')
  }

  const items: MaybeMenuItem[] = [
    <IconButton
      icon={isOver ? 'refresh' : isPlaying ? 'pause' : 'play_arrow'}
      aria-label={
        isOver ? 'Replay media button' : isPlaying ? 'Pause media button' : 'Play media button'
      }
      onClick={togglePlay}
    />,
    {
      id: 'volume',
      ui: {
        element: (
          <IconButton
            icon="volume_up"
            aria-label="Volume controls"
            onClick={() => selectSubmenu('volume')}
            isActive={selectedSubmenu.startsWith('volume')}
            className={styles.volume}
            style={{}}
          />
        ),
        tooltip: { side: 'bottom', children: 'Volume range' },
      },
      direction: 'column',
      submenu: [<input type="range" className={styles.volumeSlider} />],
    },
    <div className={styles.progress}>
      <input
        type="range"
        id="progress"
        min={0}
        max={duration || 0}
        value={currentTime}
        step={0.1}
        onChange={slide}
        className={styles.progressSlider}
      />
      <span>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>,
  ]

  return (
    <Toolbar
      //   wrapperRef={obstruction.ref}
      isOpen={isOpen}
      className={clsx(className, styles.root)}
      onFocusOut={closeSubmenu}
      selectedSubmenu={selectedSubmenu}
      items={items}
    />
  )
}
