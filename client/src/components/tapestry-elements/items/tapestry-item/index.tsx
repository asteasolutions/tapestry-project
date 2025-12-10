import clsx from 'clsx'
import { ReactNode } from 'react'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { TapestryItem as BaseTapestryItem } from 'tapestry-core-client/src/components/tapestry/items/tapestry-item'
import { THEMES } from 'tapestry-core-client/src/theme/themes'
import { computeRestrictedScale } from 'tapestry-core-client/src/view-model/utils'
import { Rectangle, Size } from 'tapestry-core/src/lib/geometry'
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

  const left = -viewport.transform.translation.dx / viewport.transform.scale
  const right = left + viewport.size.width / viewport.transform.scale
  const top = -viewport.transform.translation.dy / viewport.transform.scale
  const bottom = top + viewport.size.height / viewport.transform.scale
  const viewportRect = new Rectangle(left, top, right - left, bottom - top)
  const isVisible = viewportRect.intersects(new Rectangle(dto))

  // @ts-expect-error TS wants us to check for a media item
  const item = useObservable(itemUpload).find((i) => i.objectUrl === dto.source)

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
