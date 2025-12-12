import { RefObject } from 'react'
import { add, Rectangle } from 'tapestry-core/src/lib/geometry'
import { useTapestryConfig } from '../..'
import { getBoundingRectangle } from '../../../../lib/dom'

export function useOutlineIntersection(dialogRef: RefObject<HTMLDivElement | null>) {
  const { useStore, useStoreData } = useTapestryConfig()
  const store = useStore()
  const {
    outlinedItemId: id,
    viewport: {
      transform: { translation, scale },
    },
  } = useStoreData(['outlinedItemId', 'viewport'])

  const rect = getBoundingRectangle(dialogRef.current)
  if (!rect || !id) {
    return false
  }
  const {
    position: { x, y },
    size: { width, height },
  } = store.get(`items.${id}.dto`, ['position', 'size'])!

  const position = add(translation, { dx: x * scale, dy: y * scale })

  const itemRect = new Rectangle(
    { x: position.dx, y: position.dy },
    { width: width * scale, height: height * scale },
  )

  return itemRect.intersects(rect)
}
