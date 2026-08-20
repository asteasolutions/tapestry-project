import { Size } from 'tapestry-core/src/lib/geometry'
import { getItemOverlayScale } from '../../../view-model/utils'
import { Icon } from '../../lib/icon/index'

interface IconOverlayProps {
  itemSize: Size
  icon: 'videocam' | 'play_arrow' | 'picture_as_pdf'
}

const ICON_STYLING: Record<IconOverlayProps['icon'], React.CSSProperties> = {
  videocam: {
    fontSize: '38px',
    padding: '13px',
  },
  play_arrow: {
    fontSize: '50px',
  },
  picture_as_pdf: {
    fontSize: '31px',
    padding: '10px',
  },
}

export function IconOverlay({ itemSize, icon }: IconOverlayProps) {
  const scale = getItemOverlayScale(itemSize)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'start',
        justifyContent: 'end',
      }}
    >
      <Icon
        icon={icon}
        filled
        style={{
          color: 'var(--theme-background-primary)',
          backgroundColor: 'color-mix(in srgb, var(--theme-background-mono), transparent 50%)',
          borderRadius: '0 0 0 8px',
          transform: `scale(${scale})`,
          transformOrigin: '100% 0%',
          ...ICON_STYLING[icon],
        }}
      />
    </div>
  )
}
