import { LiteralColor } from '../../../theme/types.js'
import { ColorPicker } from '../color-picker/index.js'
import { ColorButton, ColorButtonProps } from './color-button.js'

interface ColorPickerButtonProps extends Omit<ColorButtonProps, 'onChange' | 'aria-label'> {
  onChange: (color: LiteralColor) => unknown
}

export function ColorPickerButton({ onChange, color, ...props }: ColorPickerButtonProps) {
  return (
    <ColorPicker color={color} onChange={onChange}>
      <ColorButton
        color={color}
        aria-label="Color picker"
        isSelected={!!color}
        tooltip={{ side: 'bottom', children: 'Custom color' }}
        {...props}
      />
    </ColorPicker>
  )
}
