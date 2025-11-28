import { getBounds } from 'tapestry-core-client/src/view-model/utils'
import { computeRelCurvePoints } from 'tapestry-core-client/src/view-model/rel-geometry'
import { CommentsIndicator } from '../../comments-indicator'
import { RelToolbar } from '../rel-toolbar'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { THEMES } from 'tapestry-core-client/src/theme/themes'
import {
  setInteractiveElement,
  setSidePane,
} from '../../../pages/tapestry/view-model/store-commands/tapestry'
import { memo } from 'react'

interface RelProps {
  id: string
}

export const Rel = memo(({ id }: RelProps) => {
  const dispatch = useDispatch()
  const rel = useTapestryData(`rels.${id}`)!
  const hasComments = rel.commentThread?.size
  const {
    interactiveElement,
    items,
    viewport,
    theme: themeName,
  } = useTapestryData(['interactiveElement', 'items', 'theme', 'viewport'])
  const theme = THEMES[themeName]
  const isActive = rel.dto.id === interactiveElement?.modelId

  const curve = computeRelCurvePoints(rel, viewport, items)
  const bounds = getBounds(rel.dto, items)

  return (
    <>
      {hasComments && (
        <CommentsIndicator
          n={rel.commentThread.size}
          theme={theme}
          color={rel.dto.color}
          style={{
            position: 'absolute',
            left: `${curve.points.middle.x - bounds.left}px`,
            top: `${curve.points.middle.y - bounds.top}px`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
          }}
          onClick={() => {
            dispatch(
              setInteractiveElement({ modelType: 'rel', modelId: rel.dto.id }),
              setSidePane('inline-comments'),
            )
          }}
        />
      )}
      {isActive && <RelToolbar rel={rel} relBounds={bounds} />}
    </>
  )
})
