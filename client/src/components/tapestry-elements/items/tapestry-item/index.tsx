import clsx from 'clsx'
import { ReactNode } from 'react'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { TapestryItem as BaseTapestryItem } from 'tapestry-core-client/src/components/tapestry/items/tapestry-item'
import { THEMES } from 'tapestry-core-client/src/theme/themes'
import {
  computeRestrictedScale,
  positionAtViewport,
} from 'tapestry-core-client/src/view-model/utils'
import { ORIGIN, Rectangle, scaleSize, Size } from 'tapestry-core/src/lib/geometry'
import { idMapToArray } from 'tapestry-core/src/utils'
import { useDispatch, useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import {
  setInteractiveElement,
  setSidePane,
} from '../../../../pages/tapestry/view-model/store-commands/tapestry'
import { itemUpload } from '../../../../services/item-upload'
import { CommentsIndicator } from '../../../comments-indicator'
import { UploadIndicator } from '../../../upload-indicator'
import { ResizeHandles } from '../../resize-handles'
import styles from './styles.module.css'

export interface TapestryItemProps {
  id: string
  children: ReactNode
  halo: ReactNode
}

export function TapestryItem({ id, children, halo }: TapestryItemProps) {
  const dto = useTapestryData(`items.${id}.dto`)!
  const commentThread = useTapestryData(`items.${id}.commentThread`)
  const resizeState = useTapestryData(`items.${id}.resizeState`)
  const {
    interactiveElement,
    interactionMode,
    theme: themeName,
    viewport,
  } = useTapestryData(['interactiveElement', 'interactionMode', 'theme', 'viewport'])
  const dispatch = useDispatch()
  const isEditMode = interactionMode === 'edit'

  const isContentInteractive = id === interactiveElement?.modelId

  const item = useObservable(itemUpload).find((i) => i.itemId === dto.id)

  const viewportRect = new Rectangle(
    positionAtViewport(viewport, ORIGIN),
    scaleSize(viewport.size, viewport.transform.scale),
  )
  const isVisible = viewportRect.intersects(new Rectangle(dto))

  return (
    <BaseTapestryItem
      id={id}
      halo={halo}
      classes={{
        root: styles.root,
        hitArea: styles.hitArea,
      }}
      style={!isVisible ? { display: 'none' } : undefined}
      title={
        <>
          <span>{dto.title}</span>
          {commentThread?.size && (
            <CommentsIndicator
              n={commentThread.size}
              theme={THEMES[themeName]}
              style={{ pointerEvents: 'auto' }}
              onClick={() => {
                dispatch(
                  setInteractiveElement({ modelType: 'item', modelId: id }),
                  setSidePane('inline-comments'),
                )
              }}
            />
          )}
        </>
      }
      overlay={
        <>
          {item?.state === 'uploading' && (
            <UploadIndicator progress={item.progress} className={styles.uploadIndicator} />
          )}
          {isEditMode && isContentInteractive && <ResizeHandles withRelAnchors />}
          {resizeState && (
            <ResizeIndicators
              size={dto.size}
              minSize={resizeState.minSize}
              maxSize={resizeState.maxSize}
            />
          )}
        </>
      }
    >
      {children}
    </BaseTapestryItem>
  )
}

interface ResizeIndicatorsProps {
  size: Size
  minSize: Size
  maxSize: Size
}

function ResizeIndicators({ size, minSize, maxSize }: ResizeIndicatorsProps) {
  const { viewport, items } = useTapestryData(['viewport', 'items'])

  const { scale } = viewport.transform
  const indicatorsScale = computeRestrictedScale(viewport, idMapToArray(items)) / scale

  const isRestrictedWidth = size.width === minSize.width || size.width === maxSize.width
  const isRestrictedHeight = size.height === minSize.height || size.height === maxSize.height

  return (
    <div
      className={clsx(styles.resizeIndicators, {
        [styles.restrictedWidth]: isRestrictedWidth,
        [styles.restrictedHeight]: isRestrictedHeight,
      })}
      style={{ '--scale': indicatorsScale } as React.CSSProperties}
      inert
    />
  )
}
