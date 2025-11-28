import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Select, SelectOption } from '../../../../select'

export const DEFAULT_FONT: SelectOption<string> = {
  label: 'Plus Jakarta Sans',
  value: 'Plus Jakarta Sans',
}

const FONTS: SelectOption<string>[] = [
  DEFAULT_FONT,
  { label: <span style={{ fontFamily: 'Arial' }}>Arial</span>, value: 'Arial' },
  { label: <span style={{ fontFamily: 'Tinos' }}>Tinos</span>, value: 'Tinos' },
  { label: <span style={{ fontFamily: 'Verdana' }}>Verdana</span>, value: 'Verdana' },
  { label: <span style={{ fontFamily: 'Roboto' }}>Roboto</span>, value: 'Roboto' },
  { label: <span style={{ fontFamily: 'Open Sans' }}>Open Sans</span>, value: 'Open Sans' },
  { label: <span style={{ fontFamily: 'Montserrat' }}>Montserrat</span>, value: 'Montserrat' },
  { label: <span style={{ fontFamily: 'Raleway' }}>Raleway</span>, value: 'Raleway' },
  {
    label: <span style={{ fontFamily: 'Source Code Pro' }}>Source Code Pro</span>,
    value: 'Source Code Pro',
  },
  { label: <span style={{ fontFamily: 'Cousine' }}>Cousine</span>, value: 'Cousine' },
  { label: <span style={{ fontFamily: 'Caveat' }}>Caveat</span>, value: 'Caveat' },
  { label: <span style={{ fontFamily: 'Carattere' }}>Carattere</span>, value: 'Carattere' },
]

interface FontFamilySelectorProps {
  value: string
  onChange: (font: string) => unknown
  onMenuOpen?: () => unknown
}

export function FontFamilySelector({ value, onChange, onMenuOpen }: FontFamilySelectorProps) {
  return (
    <Select
      options={FONTS}
      value={value}
      components={{
        SingleValue: () => (
          <IconButton
            aria-label="Select font family"
            icon="abc"
            tooltip={{ children: 'Font family', side: 'bottom', offset: 18 }}
          />
        ),
        DropdownIndicator: () => null,
      }}
      styles={{
        valueContainer: (base) => ({
          ...base,
          overflow: 'visible',
          padding: 0,

          '> input': {
            position: 'absolute',
          },
        }),
      }}
      onChange={(font) => {
        const value = font?.value
        if (value) {
          onChange(value)
        }
      }}
      onMenuOpen={onMenuOpen}
    />
  )
}
