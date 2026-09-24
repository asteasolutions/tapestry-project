import { memo, useRef } from 'react'
import { TapestryElementComponentProps } from '../..'
import { ItemToolbar } from '../item-toolbar'
import { TapestryItem } from '../tapestry-item'
import { WebpageItemViewer } from './viewer'
import { useItemFullscreen } from '../../../lib/hooks/use-item-fullscreen'
import styles from './styles.module.css'

export const WebpageItem = memo(({ id }: TapestryElementComponentProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, exitFullscreenButton } = useItemFullscreen(containerRef)

  return (
    <TapestryItem id={id} halo={isFullscreen ? undefined : <ItemToolbar tapestryItemId={id} />}>
      <div ref={containerRef} className={styles.container}>
        <WebpageItemViewer id={id} />
        {isFullscreen && exitFullscreenButton}
      </div>
    </TapestryItem>
  )
})
