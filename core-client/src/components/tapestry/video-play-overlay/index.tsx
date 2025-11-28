import { Size } from 'tapestry-core/src/lib/geometry'
import { getItemOverlayScale } from '../../../view-model/utils'
import { Icon } from '../../lib/icon/index'

interface VideoPlayOverlayProps {
  itemSize: Size
  type: 'videocam' | 'play_arrow'
}

const ICON_STYLING: Record<VideoPlayOverlayProps['type'], React.CSSProperties> = {
  videocam: {
    fontSize: '60px',
    padding: '20px',
  },
  play_arrow: {
    fontSize: '100px',
  },
}

export function VideoPlayOverlay({ itemSize, type }: VideoPlayOverlayProps) {
  const scale = getItemOverlayScale(itemSize)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon
        icon={type}
        filled
        style={{
          color: 'var(--theme-background-primary)',
          backgroundColor: 'color-mix(in srgb, var(--theme-background-mono), transparent 50%)',
          borderRadius: '50%',
          transform: `scale(${scale})`,
          ...ICON_STYLING[type],
        }}
      />
    </div>
  )
}
