import { useMediaSource } from '../../../lib/hooks/use-media-source'
import { memo } from 'react'
import { TapestryElementComponentProps, useTapestryConfig } from '../..'
import { ImageItem as ImageItemDto } from 'tapestry-core/src/data-format/schemas/item'

export const ImageItemViewer = memo(({ id }: TapestryElementComponentProps) => {
  const { useStoreData } = useTapestryConfig()
  const { source } = useStoreData(`items.${id}.dto`) as ImageItemDto
  const src = useMediaSource(source)

  return (
    <img src={src} style={{ display: 'block', width: '100%', height: '100%' }} draggable={false} />
  )
})
