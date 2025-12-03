import clsx from 'clsx'
import { orderBy } from 'lodash-es'
import { useEffect } from 'react'
import { Rel } from 'tapestry-core/src/data-format/schemas/rel'
import { Rectangle } from 'tapestry-core/src/lib/geometry'
import { IdMap, idMapToArray } from 'tapestry-core/src/utils'
import {
  itemComponentName,
  SELECTION_Z_INDEX,
  TapestryElementComponent,
  useTapestryConfig,
} from '../../../components/tapestry'
import { themeToDOMWriter } from '../../../theme/theme-to-dom-writer'
import { ItemViewModel } from '../../../view-model'
import {
  getBoundingRectangle,
  getBounds,
  getGroupMembers,
  isItemInSelection,
  isMultiselection,
} from '../../../view-model/utils'
import { PropsWithStyle } from '../../lib'
import { GroupBackground } from '../group-background'
import styles from './styles.module.css'

export interface TapestryCanvasProps extends PropsWithStyle<
  object,
  'root' | 'itemContainer' | 'relContainer'
> {
  orderByPosition?: boolean
}

interface TapestryElementContainerProps extends PropsWithStyle {
  id: string
  bounds: Rectangle
  component: TapestryElementComponent
}

function TapestryElementContainer({
  id,
  bounds: { top, left, width, height },
  component: Component,
  className,
}: TapestryElementContainerProps) {
  const { useStoreData } = useTapestryConfig()
  const { interactiveElement, selection, items } = useStoreData([
    'interactiveElement',
    'selection',
    'items',
  ])
  const isInteractive = id === interactiveElement?.modelId
  const isInSelection = isItemInSelection(items[id], selection)

  return (
    <div
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        // item should be above other selected items in group
        zIndex: isInteractive
          ? SELECTION_Z_INDEX + 1
          : isInSelection
            ? SELECTION_Z_INDEX
            : undefined,
      }}
      className={clsx(styles.tapestryElementContainer, className, {
        [styles.inactive]: !isInteractive,
      })}
    >
      <Component id={id} />
    </div>
  )
}

function getRelBounds(rel: Rel, items: IdMap<ItemViewModel>) {
  const fromItem = items[rel.from.itemId]!
  const toItem = items[rel.to.itemId]!

  // When from/to items of a rel change, there is an in-between render where the IDs don't match.
  // Once the useTapestryData hook updates the corresponding values, the component will be rerendered.
  if (fromItem.dto.id !== rel.from.itemId || toItem.dto.id !== rel.to.itemId) {
    return null
  }

  return getBounds(rel, { [fromItem.dto.id]: fromItem, [toItem.dto.id]: toItem })
}

export function TapestryCanvas({ classes, orderByPosition }: TapestryCanvasProps) {
  const { useStoreData, components } = useTapestryConfig()
  const { translation, scale } = useStoreData('viewport.transform', ['translation', 'scale'])
  const viewportReady = useStoreData('viewport.ready')
  const { constrainToLayer, action: pointerAction } =
    useStoreData('pointerInteraction', ['constrainToLayer', 'action']) ?? {}
  const { theme, items, rels, selection, groups } = useStoreData([
    'theme',
    'items',
    'rels',
    'selection',
    'groups',
  ])

  useEffect(() => themeToDOMWriter.init(), [])
  useEffect(() => themeToDOMWriter.updateTheme(theme), [theme])

  if (!viewportReady) {
    return
  }

  const itemsArray = idMapToArray(items)
  const orderedItems = orderByPosition
    ? orderBy(itemsArray, ['dto.position.y', 'dto.position.x'])
    : itemsArray

  function renderItem(item: ItemViewModel) {
    let component: TapestryElementComponent
    if (item.dto.type === 'webpage') {
      const { webpageType } = item.dto
      component =
        (webpageType && components.WebpageItem[webpageType]) ?? components.WebpageItem.default
    } else {
      component = components[itemComponentName(item.dto.type)]
    }

    return (
      <TapestryElementContainer
        key={item.dto.id}
        id={item.dto.id}
        bounds={getBounds(item.dto)}
        component={component}
        className={classes?.itemContainer}
      />
    )
  }

  return (
    <div
      style={{
        pointerEvents: constrainToLayer === 'dom' ? 'auto' : 'none',
        transform: `translate(${translation.dx}px, ${translation.dy}px) scale(${scale})`,
      }}
      className={clsx(
        classes?.root,
        pointerAction && 'pointer-action',
        pointerAction && `pointer-action-${pointerAction}`,
        constrainToLayer && `pointer-action-layer-${constrainToLayer}`,
      )}
    >
      {idMapToArray(rels).map((rel) => {
        const bounds = getRelBounds(rel.dto, items)
        return (
          bounds && (
            <TapestryElementContainer
              key={rel.dto.id}
              id={rel.dto.id}
              bounds={bounds}
              component={components.Rel}
              className={classes?.relContainer}
            />
          )
        )
      })}
      {orderedItems.filter((item) => !item.dto.groupId).map(renderItem)}
      {idMapToArray(groups).map((group) => {
        const members = getGroupMembers(group.dto.id, idMapToArray(items))

        return (
          <div key={group.dto.id}>
            <GroupBackground id={group.dto.id} membersBounds={getBoundingRectangle(members)} />
            {members.map(renderItem)}
          </div>
        )
      })}
      {isMultiselection(selection) && <components.Multiselection />}
    </div>
  )
}
