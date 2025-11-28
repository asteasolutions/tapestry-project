import { CSSProperties, useRef } from 'react'
import styles from './styles.module.css'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useWavesurfer } from '@wavesurfer/react'
import { getPaletteColor } from 'tapestry-core-client/src/theme/design-system'
import clsx from 'clsx'

export interface AudioPlayerProps {
  source: string
  height?: number
  className?: string
}

export function AudioPlayer({ source, height, className }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { wavesurfer, isPlaying, isReady } = useWavesurfer({
    container: containerRef,
    url: source,
    normalize: true,
    waveColor: getPaletteColor('neutral.500'),
    progressColor: getPaletteColor('primary.500'),
    cursorColor: getPaletteColor('primary.900'),
    height: 'auto',
  })

  return (
    <div
      className={clsx(styles.root, className)}
      style={{ '--height': height && `${height}px` } as CSSProperties}
    >
      <IconButton
        icon={{ name: isPlaying ? 'pause' : 'play_arrow', fill: true }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={() => void wavesurfer?.playPause()}
        disabled={!isReady}
        className={styles.button}
      />
      <div className={styles.waveform} ref={containerRef} />
    </div>
  )
}
