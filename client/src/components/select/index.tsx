import { merge } from 'lodash'
import { ReactNode, RefObject } from 'react'
// eslint-disable-next-line no-restricted-imports
import ReactSelect, { Options, Props, SelectInstance, StylesConfig, Theme } from 'react-select'
import { PartialDeep } from 'tapestry-core/src/type-utils'

export interface SelectOption<V> {
  value: V
  label: ReactNode
}

export interface SelectProps<V>
  extends Omit<Props<SelectOption<V>, false>, 'value' | 'options' | 'theme' | 'ref'> {
  value: V
  options: Options<SelectOption<V>>
  ref?: RefObject<SelectInstance<SelectOption<V>> | null>
  theme?: PartialDeep<Theme> | ((theme: Theme) => PartialDeep<Theme>)
}

function defaultStyles<V>(
  config: StylesConfig<SelectOption<V>, false> | undefined,
  defaults: StylesConfig<SelectOption<V>, false>,
) {
  const mergedConfig: StylesConfig<SelectOption<V>, false> = { ...config }
  for (const [key, createDefaultStyles] of Object.entries(defaults)) {
    const configKey = key as keyof StylesConfig<SelectOption<V>>
    mergedConfig[configKey] = (base, props) => {
      // @ts-expect-error The type of `props` cannot be correctly inferred here
      const styles = createDefaultStyles(base, props)
      const extendStyles = config?.[configKey]
      // @ts-expect-error The type of `props` cannot be correctly inferred here
      return extendStyles ? extendStyles(styles, props) : styles
    }
  }

  return mergedConfig
}

export function Select<V>({ value, options, styles, ref, theme, ...props }: SelectProps<V>) {
  return (
    <ReactSelect
      ref={ref}
      options={options}
      value={options.find((o) => o.value === value)}
      isSearchable={false}
      menuPortalTarget={document.body}
      menuPlacement="auto"
      theme={(baseTheme) => {
        const defaultTheme: Theme = merge({}, baseTheme, {
          borderRadius: 8,
          colors: {
            primary: 'var(--theme-background-selected)',
            primary50: 'var(--theme-background-brand-hover)',
          },
          spacing: {
            baseUnit: 4,
            controlHeight: 18,
            menuGutter: 0,
          },
        })

        return merge(defaultTheme, typeof theme === 'function' ? theme(defaultTheme) : theme)
      }}
      styles={defaultStyles(styles, {
        control: (baseStyles, { isDisabled }) => ({
          ...baseStyles,
          borderWidth: 0,
          width: 'fit-content',
          boxShadow: 'none',
          flexWrap: 'initial',
          backgroundColor: 'var(--theme-background-primary)',
          pointerEvents: 'auto',
          cursor: isDisabled ? 'not-allowed' : baseStyles.cursor,
        }),
        menu: (baseStyles) => ({
          ...baseStyles,
          width: 'fit-content',
          top: '8px',
          whiteSpace: 'nowrap',
          backgroundColor: 'var(--theme-background-primary)',
          boxShadow: '0px 2px 6px 2px rgba(0, 0, 0, 0.10)',
          borderRadius: '8px',
          overflow: 'hidden',
        }),
        menuList: (styles) => ({
          ...styles,
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 0',
        }),
        option: (styles, { isFocused, isSelected, isDisabled }) => ({
          ...styles,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          backgroundColor: isSelected
            ? 'var(--theme-background-selected)'
            : isFocused
              ? 'var(--theme-background-hover)'
              : 'var(--theme-background-primary)',
          color: isDisabled
            ? 'var(--theme-text-disabled)'
            : isSelected || isFocused
              ? 'var(--theme-text-link-hover)'
              : 'var(--theme-text-primary)',
          '&:active': {
            backgroundColor: 'var(--theme-background-brand-hover)',
            color: 'var(--theme-text-primary-inverse)',
          },
        }),
        singleValue: (styles, { isDisabled }) => ({
          ...styles,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginLeft: 0,
          color: isDisabled ? 'var(--theme-text-disabled)' : 'var(--theme-text-primary)',
        }),
        indicatorSeparator: () => ({ display: 'none' }),
        valueContainer: (styles) => ({
          ...styles,
          padding: '2px 12px',
        }),
        dropdownIndicator: (styles, { isDisabled }) => ({
          ...styles,
          padding: '6px',
          color: isDisabled ? 'var(--theme-text-disabled)' : 'var(--theme-text-primary)',
        }),
      })}
      {...props}
    />
  )
}
