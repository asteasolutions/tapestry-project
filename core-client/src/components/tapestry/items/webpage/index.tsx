import { memo } from 'react'
import { WebpageType } from 'tapestry-core/src/data-format/schemas/item'
import { parseWebSource } from 'tapestry-core/src/web-sources'
import { WebpageItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { ItemToolbar } from '../item-toolbar'
import { TapestryItem } from '../tapestry-item'
import { useItemFullscreen } from '../../../lib/hooks/use-item-fullscreen'
import { WebpageItemViewer } from './viewer'
import styles from './styles.module.css'

const PLAYABLE_WEBPAGE_TYPES: WebpageType[] = ['iaAudio', 'iaVideo', 'vimeo', 'youtube']

export const WebpageItem = memo(({ id }: TapestryElementComponentProps) => {
  const { useStoreData } = useTapestryConfig()
  const dto = useStoreData(`items.${id}.dto`) as WebpageItemDto
  const { webpageType } = parseWebSource(dto)
  const isPlayable = !!webpageType && PLAYABLE_WEBPAGE_TYPES.includes(webpageType)

  const { containerRef, fullscreenButton, isFullscreen, exitFullscreenButton } =
    useItemFullscreen<HTMLDivElement>()

  return (
    <TapestryItem
      id={id}
      halo={
        isFullscreen ? undefined : (
          <ItemToolbar tapestryItemId={id} items={isPlayable ? [] : [fullscreenButton]} />
        )
      }
    >
      <div ref={containerRef} className={styles.fullscreenController}>
        <WebpageItemViewer id={id} />
        {isFullscreen && exitFullscreenButton}
      </div>
    </TapestryItem>
  )
})
