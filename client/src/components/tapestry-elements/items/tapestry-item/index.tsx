import { ReactNode } from 'react'
import styles from './styles.module.css'
import clsx from 'clsx'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { itemUpload } from '../../../../services/item-upload'
import { UploadIndicator } from '../../../upload-indicator'
import { CommentsIndicator } from '../../../comments-indicator'
import { useDispatch, useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import {
  setInteractiveElement,
  setSidePane,
} from '../../../../pages/tapestry/view-model/store-commands/tapestry'
import { THEMES } from 'tapestry-core-client/src/theme/themes'
import { ResizeHandles } from '../../resize-handles'
import { Size } from 'pixi.js'
import { idMapToArray } from 'tapestry-core/src/utils'
import { computeRestrictedScale } from 'tapestry-core-client/src/view-model/utils'
import { TapestryItem as BaseTapestryItem } from 'tapestry-core-client/src/components/tapestry/items/tapestry-item'

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
  } = useTapestryData(['interactiveElement', 'interactionMode', 'theme'])
  const dispatch = useDispatch()
  const isEditMode = interactionMode === 'edit'

  const isContentInteractive = id === interactiveElement?.modelId

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
