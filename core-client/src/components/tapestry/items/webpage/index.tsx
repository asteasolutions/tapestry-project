import { memo } from 'react'
import { WebpageType } from 'tapestry-core/src/data-format/schemas/item'
import { TapestryElementComponentProps } from '../..'
import { ItemToolbar } from '../item-toolbar'
import { TapestryItem } from '../tapestry-item'
import { useItemFullscreen } from '../../../lib/hooks/use-item-fullscreen'
import { WebpageItemViewer } from './viewer'
import styles from './styles.module.css'

export const PLAYABLE_WEBPAGE_TYPES: WebpageType[] = ['iaAudio', 'iaVideo', 'vimeo', 'youtube']

export const WebpageItem = memo(({ id }: TapestryElementComponentProps) => {
  const { containerRef, isFullscreen, exitFullscreenButton } = useItemFullscreen<HTMLDivElement>({
    exitButtonStyle: { position: 'absolute', top: 16, right: 16 },
  })
  return (
    <TapestryItem id={id} halo={!isFullscreen && <ItemToolbar tapestryItemId={id} />}>
      <div ref={containerRef} className={styles.fullscreenController}>
        <WebpageItemViewer id={id} />
        {isFullscreen && exitFullscreenButton}
      </div>
    </TapestryItem>
  )
})
