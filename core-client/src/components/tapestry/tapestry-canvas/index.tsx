import clsx from 'clsx'
import { orderBy } from 'lodash-es'
import { useEffect } from 'react'
import { Rel } from 'tapestry-core/src/data-format/schemas/rel'
import { LinearTransform, Rectangle } from 'tapestry-core/src/lib/geometry'
import { IdMap, idMapToArray } from 'tapestry-core/src/utils'
import {
  itemComponentName,
  ZOrder,
  TapestryElementComponent,
  useTapestryConfig,
} from '../../../components/tapestry'
import { themeToDOMWriter } from '../../../theme/theme-to-dom-writer'
import { ItemViewModel } from '../../../view-model'
import { getBounds, isItemInSelection, isMultiselection } from '../../../view-model/utils'
import { PropsWithStyle } from '../../lib'
import styles from './styles.module.css'
import { cssTransformForLocation } from '../../../stage/utils'
import { ItemType } from 'tapestry-core/src/data-format/schemas/item'
import { isMac, isMobile } from '../../../lib/user-agent'

export type TapestryCanvasProps = PropsWithStyle<object, 'root' | 'itemLocator' | 'relLocator'>

interface TapestryElementLocatorProps extends PropsWithStyle {
  id: string
  bounds: Rectangle
  component: TapestryElementComponent
  transform: LinearTransform
}

const PERSIST_ITEM_TYPES: ItemType[] = ['audio', 'video', 'book', 'pdf', 'text', 'webpage']

export function hasPersistentState(itemType: ItemType) {
  return (PERSIST_ITEM_TYPES as (string | undefined)[]).includes(itemType)
}

export const displayPersistedState = !(isMobile && isMac)

function TapestryElementLocator({
  id,
  bounds: { top, left, width, height },
  component: Component,
  className,
  transform,
}: TapestryElementLocatorProps) {
  const { useStoreData } = useTapestryConfig()
  const { interactiveElement, selection, disableOptimizations } = useStoreData([
    'interactiveElement',
    'selection',
    'disableOptimizations',
  ])
  const item = useStoreData(`items.${id}`)
  const isInteractive = id === interactiveElement?.modelId
  const isInSelection = isItemInSelection(item, selection)
  const hasBeenActive = !!item?.hasBeenActive
  const shouldDisplayDom =
    disableOptimizations || isInteractive || item?.isPlaying || !item?.snapshotId

  if (!shouldDisplayDom && !(hasBeenActive && hasPersistentState(item.dto.type))) {
    // The item should currently be hidden since it is not interactive and a placeholder will be displayed instead.
    // In this case we don't want to keep this item in the DOM at all. The only exception is if the user has interacted
    // with the item and we want to preserve its internal state. In this case we want to keep the item in the DOM but
    // hide it somehow so that it doesn't participate in the browser's layout cycles during navigation.
    return null
  }

  return (
    <div
      style={
        shouldDisplayDom || displayPersistedState
          ? {
              position: 'absolute',
              top: `${top}px`,
              left: `${left}px`,
              width: `${width}px`,
              height: `${height}px`,
              ...cssTransformForLocation({ x: left, y: top }, transform),
              // item should be above other selected items in group
              zIndex: isInteractive
                ? ZOrder.interaction
                : isInSelection
                  ? ZOrder.selection
                  : undefined,
            }
          : // Don't use display: none since some browsers put web pages (iframes) in background mode and also
            // PDFs get redrawn and flash on re-entry. Moving the content far off-screen and making sure it is
            // not involved in the main DOM layout keeps the element "alive" while preserving browser resources.
            {
              position: 'fixed',
              left: '-100000px',
              top: '0',
              width: `${width}px`,
              height: `${height}px`,
              overflow: 'hidden',
              opacity: '0',
              pointerEvents: 'none',
              contain: 'layout paint style',
            }
      }
      className={clsx('tapestry-element-locator', className, {
        [styles.inactive]: !isInteractive,
      })}
    >
      <Component id={id} />
    </div>
  )
}

function getRelBounds(rel: Rel, items: IdMap<ItemViewModel>) {
  const fromItem = items[rel.from.itemId]
  const toItem = items[rel.to.itemId]

  // When from/to items of a rel change, there is an in-between render where the IDs don't match.
  // Once the useTapestryData hook updates the corresponding values, the component will be rerendered.
  if (fromItem?.dto.id !== rel.from.itemId || toItem?.dto.id !== rel.to.itemId) {
    return null
  }

  return getBounds(rel, { [fromItem.dto.id]: fromItem, [toItem.dto.id]: toItem })
}

export function TapestryCanvas({ classes, style }: TapestryCanvasProps) {
  const { useStoreData, components } = useTapestryConfig()
  const transform = useStoreData('viewport.transform', ['translation', 'scale'])
  const viewportReady = useStoreData('viewport.ready')
  const { constrainToLayer, action: pointerAction } =
    useStoreData('pointerInteraction', ['constrainToLayer', 'action']) ?? {}
  const { theme, items, rels, selection } = useStoreData(['theme', 'items', 'rels', 'selection'])

  useEffect(() => themeToDOMWriter.init(), [])
  useEffect(() => themeToDOMWriter.updateTheme(theme), [theme])

  if (!viewportReady) {
    return
  }

  const itemsArray = idMapToArray(items)
  const orderedItems = orderBy(itemsArray, 'dto.layer')

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
      <TapestryElementLocator
        key={item.dto.id}
        id={item.dto.id}
        bounds={getBounds(item.dto)}
        component={component}
        className={classes?.itemLocator}
        transform={transform}
      />
    )
  }

  return (
    <div
      style={{ pointerEvents: constrainToLayer === 'dom' ? 'auto' : 'none', ...style }}
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
            <TapestryElementLocator
              key={rel.dto.id}
              id={rel.dto.id}
              bounds={bounds}
              component={components.Rel}
              className={classes?.relLocator}
              transform={transform}
            />
          )
        )
      })}
      {orderedItems.map(renderItem)}
      {isMultiselection(selection) && <components.Multiselection />}
    </div>
  )
}
