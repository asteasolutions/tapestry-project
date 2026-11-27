import clsx from 'clsx'
import { ReactNode } from 'react'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { TapestryItem as BaseTapestryItem } from 'tapestry-core-client/src/components/tapestry/items/tapestry-item'
import { computeRestrictedScale } from 'tapestry-core-client/src/view-model/utils'
import { Size } from 'tapestry-core/src/lib/geometry'
import { idMapToArray } from 'tapestry-core/src/utils'
import { useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { itemUpload } from '../../../../services/item-upload'
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
  const resizeState = useTapestryData(`items.${id}.resizeState`)
  const { interactiveElement, interactionMode } = useTapestryData([
    'interactiveElement',
    'interactionMode',
    'viewport',
  ])
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
      title={<span>{dto.title}</span>}
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
