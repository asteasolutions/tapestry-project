import { toPairs } from 'lodash'
import { getPaletteColor } from 'tapestry-core-client/src/theme/design-system'
import { LiteralColor } from 'tapestry-core-client/src/theme/types'
import { ColorButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import { ColorPickerButton } from 'tapestry-core-client/src/components/lib/buttons/color-picker-button'

interface CanvasBackgroundSelectorProps {
  currentColor: LiteralColor
  onChange: (color: LiteralColor) => unknown
}
const BACKGROUND_COLORS: Record<LiteralColor, string> = {
  [getPaletteColor('neutral.0')]: 'White',
  [getPaletteColor('neutral.100')]: 'Light Grey',
  [getPaletteColor('neutral.300')]: 'Medium Grey',
  '#2c2c2c': 'Dark Grey',
  [getPaletteColor('neutral.1000')]: 'Black',

  '#fbf3d0': 'Light yellow',
  '#ebe0e4': 'Light violet',
  '#f1e8f3': 'Light purple',
  '#e6eafe': 'Lavender',
  '#e7f6fd': 'Light blue',

  '#f0cc7a': 'Pastel yellow',
  '#4a1e3d': 'Violet',
  '#383044': 'Dark purple',
  '#252756': 'Space cadet',
  '#1f398a': 'Marian blue',

  '#d29875': 'Pastel orange',
  '#588274': 'Pastel green',
  '#54574a': 'Khaki',
  '#052b3d': 'Prussian blue',
}

export function CanvasBackgroundSelector({
  currentColor,
  onChange,
}: CanvasBackgroundSelectorProps) {
  const isCustomColor = !Object.keys(BACKGROUND_COLORS).includes(currentColor)
  return (
    <div>
      <Text variant="bodyXs">Canvas background</Text>
      <div className={styles.colorOptions}>
        {(toPairs(BACKGROUND_COLORS) as [LiteralColor, string][]).map(([color, label]) => (
          <ColorButton
            key={color}
            color={color}
            aria-label={label}
            onClick={() => onChange(color)}
            isSelected={currentColor === color}
            tooltip={{ side: 'bottom', children: label }}
          />
        ))}
        <ColorPickerButton onChange={onChange} color={isCustomColor ? currentColor : undefined} />
      </div>
    </div>
  )
}
