import { RefObject } from 'react'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import styles from './styles.module.css'
import { GridState } from '../../../../pages/tapestry/view-model/utils'

interface GridInputProps {
  grid: GridState
  elementsCount: number
  onChange: (columns: GridState) => unknown
  onSubmit: (columns: GridState) => unknown
  ref?: RefObject<HTMLInputElement | null>
}

export function GridInput({ grid, elementsCount, onChange, onSubmit, ref }: GridInputProps) {
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault()
        onSubmit(grid)
      }}
      className={styles.root}
    >
      <Text variant="bodySm">Columns</Text>
      <Input
        ref={ref}
        type="number"
        min={1}
        max={elementsCount}
        value={Number.isNaN(grid.cols) ? '' : grid.cols}
        onChange={(e) => {
          const cols = Number.parseInt(e.target.value)
          onChange({ ...grid, cols, rows: Math.ceil(elementsCount / cols), primary: 'cols' })
        }}
      />
      <Text variant="bodySm">Rows</Text>
      <Input
        type="number"
        min={1}
        max={elementsCount}
        value={Number.isNaN(grid.rows) ? '' : grid.rows}
        onChange={(e) => {
          const rows = Number.parseInt(e.target.value)
          onChange({ ...grid, rows, cols: Math.ceil(elementsCount / rows), primary: 'rows' })
        }}
      />
      <Text variant="bodySm">Spacing</Text>
      <Input
        type="number"
        min={0}
        value={Number.isNaN(grid.spacing) ? '' : grid.spacing}
        onChange={(e) =>
          onChange({
            ...grid,
            spacing: Number.parseInt(e.target.value),
          })
        }
      />
      <span />
      <Button
        variant="primary"
        size="small"
        disabled={Number.isNaN(grid.rows) || Number.isNaN(grid.cols) || Number.isNaN(grid.spacing)}
      >
        Apply
      </Button>
    </form>
  )
}
