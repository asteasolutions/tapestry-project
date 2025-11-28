import { PropsWithChildren, ReactNode } from 'react'
import styles from './styles.module.css'
import clsx from 'clsx'
import { Text } from '../../../lib/text/index'
import { DOM_CONTAINER_CLASS } from '../../../../stage/utils'
import { useTapestryConfig } from '../..'
import { setInteractiveElement } from '../../../../view-model/store-commands/tapestry'
import { PropsWithStyle } from '../../../lib'

export const ACTIVE_ITEM_BORDER_WIDTH = 3

export interface TapestryItemProps
  extends PropsWithStyle<PropsWithChildren, 'root' | 'title' | 'content' | 'hitArea'> {
  id: string
  halo: ReactNode
  overlay?: ReactNode
  title?: ReactNode
}

export function TapestryItem({
  id,
  children,
  halo,
  title,
  overlay,
  style,
  classes,
}: TapestryItemProps) {
  const { useStoreData, useDispatch } = useTapestryConfig()
  const dto = useStoreData(`items.${id}.dto`)!
  const { interactiveElement, selection, outlinedItemId } = useStoreData([
    'interactiveElement',
    'selection',
    'outlinedItemId',
  ])
  const scale = useStoreData('viewport.transform.scale')
  const dispatch = useDispatch()

  const isContentInteractive = id === interactiveElement?.modelId
  const isSelected = selection.itemIds.has(id)

  return (
    <div
      className={clsx(styles.root, DOM_CONTAINER_CLASS, classes?.root, {
        'tapestry-item-active': isContentInteractive,
        'tapestry-item-selected': isSelected,
        'tapestry-item-outlined': outlinedItemId === id,
      })}
      style={
        {
          '--active-border-width': `${ACTIVE_ITEM_BORDER_WIDTH}px`,
          '--scale': scale,
          '--item-width': dto.size.width,
          '--item-height': dto.size.height,
          ...style,
        } as React.CSSProperties
      }
      data-component-type="item"
      data-model-id={id}
      tabIndex={0}
      aria-label={`${dto.type} item`}
      role="document"
      onKeyDown={(e) => {
        if (e.code === 'Enter') {
          dispatch(setInteractiveElement({ modelType: 'item', modelId: id }))
        }
      }}
    >
      {halo}
      <Text
        component="div"
        variant="bodySm"
        lineClamp={2}
        className={clsx(styles.titleContainer, classes?.title)}
      >
        {title ?? <span>{dto.title}</span>}
      </Text>

      <div
        className={clsx(styles.wrapper, { [styles.dropShadow]: dto.dropShadow })}
        data-captures-pointer-events={isContentInteractive ? '' : undefined}
      >
        <div className={clsx(styles.content, classes?.content)} inert={!isContentInteractive}>
          {children}
        </div>
        <div
          className={clsx(styles.dragArea, classes?.hitArea)}
          data-ui-component="dragArea"
          inert={isContentInteractive}
        />
      </div>

      {overlay}
    </div>
  )
}
