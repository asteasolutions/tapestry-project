import { useEffect, useRef, useState } from 'react'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons'
import { MenuItem } from 'tapestry-core-client/src/components/lib/toolbar'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import {
  arrangeItems,
  clearItemPreviews,
} from '../../../pages/tapestry/view-model/store-commands/items'
import { GridState } from '../../../pages/tapestry/view-model/utils'
import { GridInput } from './grid-input'

function defaultGrid(nItems: number): GridState {
  const cols = Math.ceil(Math.sqrt(nItems))
  return {
    rows: Math.ceil(nItems / cols),
    cols,
    spacing: 100,
    primary: 'cols',
  }
}

function useGridState(elementsCount: number) {
  const [grid, setGrid] = useState(defaultGrid(elementsCount))
  useEffect(() => {
    setGrid(defaultGrid(elementsCount))
  }, [elementsCount])

  return [grid, setGrid] as const
}

const GRID_SUBMENU_ID = 'grid_align'
export type GridSubmenu = typeof GRID_SUBMENU_ID

export function useGridArrangeButton({
  selectedSubmenu,
  selectSubmenu,
}: {
  selectedSubmenu: string
  selectSubmenu: (id: GridSubmenu) => void
}): MenuItem {
  const dispatch = useDispatch()
  const selection = useTapestryData('selection')
  const elementsCount = selection.itemIds.size + selection.groupIds.size

  const [grid, setGrid] = useGridState(elementsCount)

  const columnSelectorRef = useRef<HTMLInputElement>(null)

  return {
    id: GRID_SUBMENU_ID,
    ui: {
      element: (
        <IconButton
          icon="grid_view"
          aria-label="Algin in grid"
          onClick={() => {
            selectSubmenu(GRID_SUBMENU_ID)
            if (selectedSubmenu === GRID_SUBMENU_ID) {
              dispatch(clearItemPreviews())
              setGrid(defaultGrid(elementsCount))
            } else {
              dispatch(arrangeItems(grid, true))
              // The toolbar submenu is inert while not opened, so we can't focus an item in it
              setTimeout(() => columnSelectorRef.current?.focus())
            }
          }}
        />
      ),
      tooltip: { side: 'bottom', children: 'Arrange in grid' },
    },
    submenu: [
      <GridInput
        ref={columnSelectorRef}
        grid={grid}
        elementsCount={elementsCount}
        onChange={(grid) => {
          setGrid(grid)
          dispatch(arrangeItems(grid, true))
        }}
        onSubmit={(grid) => {
          close()
          dispatch(clearItemPreviews(), arrangeItems(grid, false))
        }}
      />,
    ],
  }
}
