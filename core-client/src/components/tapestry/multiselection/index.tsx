import styles from './styles.module.css'
import { computeRestrictedScale } from '../../../view-model/utils'
import clsx from 'clsx'
import { idMapToArray } from 'tapestry-core/src/utils'
import { cssTransformForLocation, DOM_CONTAINER_CLASS } from '../../../stage/utils'
import { Rectangle } from 'tapestry-core/src/lib/geometry'
import { PropsWithChildren, ReactNode } from 'react'
import { PropsWithStyle } from '../../lib'
import { useTapestryConfig, ZOrder } from '..'
import { useSingleGroupSelection } from '../../lib/hooks/use-single-group-selection'
import { getOpaqueColor } from '../../../theme/types'

export interface MultiselectionProps extends PropsWithStyle<PropsWithChildren> {
  bounds: Rectangle
  halo: ReactNode
}

export function Multiselection({ bounds, halo, style, className, children }: MultiselectionProps) {
  const { useStoreData } = useTapestryConfig()
  const { items, interactiveElement, viewport } = useStoreData([
    'items',
    'interactiveElement',
    'viewport',
  ])

  const selectedGroup = useSingleGroupSelection()

  const { top, left, width, height } = bounds

  // A single selected group is rendered with its own border. Its background is rendered separately
  // before the items (see SelectedGroupBackground), so that it doesn't cover them.
  const groupColor = selectedGroup?.dto.color
  const groupBorder =
    selectedGroup?.dto.hasBorder && groupColor ? getOpaqueColor(groupColor) : undefined

  const borderScale =
    computeRestrictedScale(viewport, idMapToArray(items)) / viewport.transform.scale

  return (
    <div
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: ZOrder.selection,
        ...cssTransformForLocation({ x: left, y: top }, viewport.transform),
        ...{ '--border-scale': borderScale },
        borderColor: groupBorder,
        ...style,
      }}
      data-component-type="multiselection"
      className={clsx(DOM_CONTAINER_CLASS, styles.multiselection, className, {
        [styles.group]: !!selectedGroup,
      })}
    >
      {!interactiveElement && halo}
      <div className={styles.dragHandle} data-ui-component="dragArea" />
      {children}
    </div>
  )
}
