import { useMediaSource } from '../../../lib/hooks/use-media-source'
import { memo } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { ImageItem as ImageItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { isHeicSource } from 'tapestry-core/src/utils'
import { LoadingSpinner } from '../../../lib/loading-spinner/index'
import { ItemPlaceholder } from '../../item-placeholder'
import styles from './styles.module.css'

export function HeicConvertingPlaceholder() {
  return (
    <div className={styles.loadingPlaceholder}>
      <ItemPlaceholder classes={{ root: styles.placeholder }} icon="image">
        Converting...
      </ItemPlaceholder>
      <LoadingSpinner size="48px" className={styles.spinner} />
    </div>
  )
}

export const ImageItemViewer = memo(({ id }: TapestryElementComponentProps) => {
  const { useStoreData } = useTapestryConfig()
  const { source } = useStoreData(`items.${id}.dto`) as ImageItemDto
  const src = useMediaSource(source)

  if (isHeicSource(source)) {
    return <HeicConvertingPlaceholder />
  }

  return (
    <img
      src={src}
      // Images that may be loaded via `fetch` elsewhere must always be loaded with CORS policy "anonymous"
      // in order to prevent cached CORS header errors in Chrome.
      crossOrigin="anonymous"
      style={{ display: 'block', width: '100%', height: '100%' }}
      draggable={false}
    />
  )
})
