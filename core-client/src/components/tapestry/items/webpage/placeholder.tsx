import { WebpageItem as WebpageItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { ItemPlaceholder } from '../../item-placeholder'
import { VideoPlayOverlay } from '../../video-play-overlay'
import styles from './styles.module.css'

export interface WebpagePlaceholderProps {
  item: WebpageItemDto
}

export function WebpagePlaceholder({
  item: { thumbnail, size, webpageType, customThumbnail },
}: WebpagePlaceholderProps) {
  const showVideoPlayOverlay =
    webpageType === 'youtube' || webpageType === 'vimeo' || webpageType === 'iaVideo'

  return (
    <div className={styles.placeholder}>
      {showVideoPlayOverlay && <VideoPlayOverlay itemSize={size} type="videocam" />}
      <ItemPlaceholder icon="hourglass_top" thumbnailSrc={customThumbnail ?? thumbnail?.source}>
        Generating thumbnail...
      </ItemPlaceholder>
    </div>
  )
}
