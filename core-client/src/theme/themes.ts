import { get } from 'lodash-es'
import { DESIGN_SYSTEM, getPaletteColor } from './design-system.js'
import { ThemeColor, ThemeConfig } from './types.js'

export class Theme {
  constructor(
    readonly name: ThemeName,
    readonly config: Readonly<ThemeConfig>,
    private designSystem = DESIGN_SYSTEM,
  ) {}

  color(name: ThemeColor) {
    return getPaletteColor(get(this.config.colors, name), this.designSystem)
  }

  get palette() {
    return this.designSystem.palette
  }

  get typography() {
    return this.designSystem.typography
  }
}

export const THEME_NAMES = ['light', 'dark'] as const
export type ThemeName = (typeof THEME_NAMES)[number]
export const THEMES: Record<ThemeName, Theme> = {
  light: new Theme('light', {
    colors: {
      contrast: 'neutral.1000',
      text: {
        primary: 'neutral.900',
        primaryInverse: 'neutral.0',
        secondary: 'neutral.800',
        secondaryInverse: 'neutral.100',
        secondaryStatic: 'neutral.800',
        tertiary: 'neutral.400',
        tertiaryInverse: 'neutral.200',
        disabled: 'neutral.300',
        brand: 'primary.900',
        link: 'primary.500',
        linkHover: 'primary.700',
        linkFocused: 'primary.500',
        warning: 'warning.800',
        negative: 'error.600',
        negativeHover: 'error.700',
        positive: 'success.700',
      },
      background: {
        interface: 'neutral.150',
        primary: 'neutral.0',
        hover: 'primary.50',
        selected: 'primary.50',
        neutral: 'neutral.100',
        neutralHover: 'neutral.150',
        disabled: 'neutral.50',
        brand: 'primary.900',
        brandHover: 'primary.400',
        brandSecondary: 'secondary.400',
        brandSecondaryHover: 'secondary.300',
        inverse: 'neutral.900',
        secondaryInverse: 'neutral.600',
        info: 'primary.500',
        infoSubtle: 'primary.50',
        warning: 'warning.500',
        warningSubtle: 'warning.100',
        negative: 'error.400',
        negativeHover: 'error.600',
        negativeSubtle: 'error.50',
        positive: 'success.600',
        positiveSubtle: 'success.100',
        mono: 'neutral.950',
        monoHover: 'neutral.800',
        systemStatic: 'neutral.1000',
      },
      icon: {
        primary: 'neutral.800',
        primaryStatic: 'neutral.900',
        inverse: 'neutral.0',
        selected: 'primary.900',
        disabled: 'neutral.300',
        info: 'primary.500',
        warning: 'warning.600',
        negative: 'error.600',
        positive: 'success.600',
        inverseStatic: 'neutral.50',
        brand: 'primary.900',
      },
      border: {
        primary: 'neutral.300',
        subtle: 'neutral.150',
        inverse: 'neutral.0',
        selected: 'primary.900',
        disabled: 'neutral.200',
        brand: 'primary.900',
        brandFocus: 'primary.300',
        info: 'primary.700',
        warning: 'warning.600',
        negative: 'error.400',
        positive: 'success.600',
        mono: 'neutral.900',
        focus: 'primary.500',
        focusButton: 'secondary.400',
      },
      overlay: '#0000003d',
    },
  }),
  dark: new Theme('dark', {
    colors: {
      contrast: 'neutral.0',
      text: {
        primary: 'neutral.100',
        primaryInverse: 'neutral.950',
        secondary: 'neutral.100',
        secondaryInverse: 'neutral.900',
        secondaryStatic: 'neutral.800',
        tertiary: 'neutral.600',
        tertiaryInverse: 'neutral.200',
        disabled: 'neutral.500',
        brand: 'primary.300',
        link: 'primary.300',
        linkHover: 'primary.300',
        linkFocused: 'primary.300',
        warning: 'warning.500',
        negative: 'error.400',
        negativeHover: 'error.300',
        positive: 'success.400',
      },
      background: {
        interface: 'neutral.950',
        primary: 'neutral.950',
        hover: '#6185f333',
        selected: '#6185f333',
        neutral: 'neutral.700',
        neutralHover: 'neutral.600',
        disabled: 'neutral.800',
        brand: 'primary.300',
        brandHover: 'primary.200',
        brandSecondary: 'secondary.400',
        brandSecondaryHover: 'secondary.300',
        inverse: 'neutral.100',
        secondaryInverse: 'neutral.0',
        info: 'primary.400',
        infoSubtle: 'primary.800',
        warning: 'warning.500',
        warningSubtle: 'warning.700',
        negative: 'error.400',
        negativeHover: 'error.300',
        negativeSubtle: 'error.800',
        positive: 'success.700',
        positiveSubtle: 'success.900',
        mono: 'neutral.100',
        monoHover: 'neutral.0',
        systemStatic: 'neutral.1000',
      },
      icon: {
        primary: 'neutral.150',
        primaryStatic: 'neutral.900',
        inverse: 'neutral.950',
        selected: 'primary.300',
        disabled: 'neutral.500',
        info: 'primary.300',
        warning: 'warning.500',
        negative: 'error.400',
        positive: 'success.400',
        inverseStatic: 'neutral.50',
        brand: 'primary.300',
      },
      border: {
        primary: 'neutral.500',
        subtle: 'neutral.800',
        inverse: 'neutral.900',
        selected: 'primary.300',
        disabled: 'neutral.800',
        brand: 'primary.300',
        brandFocus: 'primary.100',
        info: 'primary.300',
        warning: 'warning.500',
        negative: 'error.300',
        positive: 'success.500',
        mono: 'neutral.100',
        focus: 'primary.300',
        focusButton: 'secondary.400',
      },
      overlay: '#93939369',
    },
  }),
}
