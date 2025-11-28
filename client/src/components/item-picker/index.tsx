import { idMapToArray } from 'tapestry-core/src/utils'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'
import { useTapestryData } from '../../pages/tapestry/tapestry-providers'
import styles from './styles.module.css'
import { CSSProperties, useState } from 'react'
import { computeRestrictedScale, getBounds } from 'tapestry-core-client/src/view-model/utils'
import clsx from 'clsx'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { without } from 'lodash'
import { EditableItemViewModel } from '../../pages/tapestry/view-model'

export interface ItemPickerProps {
  initialSelection: string[]
  onItemsChanged: (pickedItemIds: string[]) => void
  isSelectable?: (item: EditableItemViewModel) => boolean
}

export function ItemPicker({
  initialSelection,
  onItemsChanged,
  isSelectable = () => true,
}: ItemPickerProps) {
  const { items, viewport } = useTapestryData(['items', 'viewport'])
  const [pickedItemIds, setPickedItemIds] = useState(initialSelection)
  const onChange = usePropRef(onItemsChanged)
  const itemsArray = idMapToArray(items)
  const restrictedScale = computeRestrictedScale(viewport, itemsArray) / viewport.transform.scale

  return (
    <div className={styles.root} data-captures-pointer-events>
      <div
        style={
          {
            position: 'absolute',
            transform: `translate(${viewport.transform.translation.dx}px, ${viewport.transform.translation.dy}px) scale(${viewport.transform.scale})`,
            '--scale': restrictedScale,
          } as CSSProperties
        }
      >
        {itemsArray.map((item) => {
          if (!isSelectable(item)) {
            return
          }
          const { top, left, width, height } = getBounds(item.dto)
          const id = item.dto.id
          const indexInSelection = pickedItemIds.indexOf(id)
          return (
            <button
              key={id}
              className={clsx(styles.itemOverlay, { [styles.selected]: indexInSelection >= 0 })}
              style={
                {
                  '--item-top': `${top}px`,
                  '--item-left': `${left}px`,
                  '--item-width': `${width}px`,
                  '--item-height': `${height}px`,
                } as CSSProperties
              }
              onClick={() => {
                const newPickedItemIds = pickedItemIds.includes(id)
                  ? without(pickedItemIds, id)
                  : [...pickedItemIds, id]
                setPickedItemIds(newPickedItemIds)
                onChange.current(newPickedItemIds)
              }}
            >
              <div className={styles.itemSlot}>
                {indexInSelection >= 0 && <Text>{indexInSelection + 1}</Text>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
