import { memo } from 'react'
import { Rectangle } from 'tapestry-core/src/lib/geometry'
import { computeRestrictedScale, MULTISELECT_RECTANGLE_PADDING } from '../../../view-model/utils'
import { DOM_CONTAINER_CLASS } from '../../../stage/utils'
import styles from './styles.module.css'
import clsx from 'clsx'
import { idMapToArray } from 'tapestry-core/src/utils'
import { getOpaqueColor } from '../../../theme/types'
import { SELECTION_Z_INDEX, useTapestryConfig } from '..'

export interface GroupBackgroundProps {
  id: string
  membersBounds: Rectangle
}

export const GroupBackground = memo(({ id, membersBounds }: GroupBackgroundProps) => {
  const { useStoreData } = useTapestryConfig()
  const group = useStoreData(`groups.${id}`)!

  const { selection, viewport, items } = useStoreData(['selection', 'viewport', 'items'])
  const isSelected = selection.groupIds.has(id)

  if (!(group.dto.color || isSelected)) {
    return
  }

  const borderScale =
    computeRestrictedScale(viewport, idMapToArray(items)) / viewport.transform.scale

  const groupBounds = membersBounds.expand(MULTISELECT_RECTANGLE_PADDING)
  const { top, left, width, height } = groupBounds

  const opaqueColor = group.dto.color && getOpaqueColor(group.dto.color)
  const isClickable =
    isSelected || (group.dto.color && (group.dto.hasBackground || group.dto.hasBorder))

  return (
    <div
      style={{
        pointerEvents: isClickable ? 'auto' : 'none',
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        ...{
          '--group-background-color': group.dto.hasBackground ? group.dto.color : undefined,
          '--group-border-color': group.dto.hasBorder ? opaqueColor : undefined,
          '--border-scale': borderScale,
        },
        zIndex: isSelected ? SELECTION_Z_INDEX : undefined,
      }}
      data-component-type="group"
      data-model-id={group.dto.id}
      data-ui-component="dragArea"
      className={clsx(DOM_CONTAINER_CLASS, styles.group, {
        [styles.selected]: isSelected,
        [styles.hasBackground]: group.dto.hasBackground,
        [styles.hasBorder]: group.dto.hasBorder,
      })}
    />
  )
})
