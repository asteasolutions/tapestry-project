import { WebpageItem as WebpageItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { ItemPlaceholder } from '../../item-placeholder'
import { IconOverlay } from '../../video-play-overlay'
import styles from './styles.module.css'
import { getPrimaryThumbnail } from '../../../../view-model/utils'

export interface WebpagePlaceholderProps {
  item: WebpageItemDto
}

export function WebpagePlaceholder({
  item: { thumbnail, size, webpageType },
}: WebpagePlaceholderProps) {
  const showVideoPlayOverlay =
    webpageType === 'youtube' || webpageType === 'vimeo' || webpageType === 'iaVideo'

  return (
    <div className={styles.placeholder}>
      {showVideoPlayOverlay && <IconOverlay itemSize={size} icon="videocam" />}
      <ItemPlaceholder icon="hourglass_top" thumbnailSrc={getPrimaryThumbnail(thumbnail)}>
        Generating thumbnail...
      </ItemPlaceholder>
    </div>
  )
}
