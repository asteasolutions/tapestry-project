import { LeafPath } from 'tapestry-core/src/type-utils'

export const TYPOGRAPHY_PROPERTIES = ['fontFamily', 'fontSize', 'lineHeight', 'fontWeight'] as const

export type Typography = Pick<CSSStyleDeclaration, (typeof TYPOGRAPHY_PROPERTIES)[number]>

export type LiteralColor = `#${string}`

export interface ColorShades {
  readonly '50': LiteralColor
  readonly '100': LiteralColor
  readonly '200': LiteralColor
  readonly '300': LiteralColor
  readonly '400': LiteralColor
  readonly '500': LiteralColor
  readonly '600': LiteralColor
  readonly '700': LiteralColor
  readonly '800': LiteralColor
  readonly '900': LiteralColor
}

export interface ExtendedColorShades extends ColorShades {
  readonly '0': LiteralColor
  readonly '150': LiteralColor
  readonly '950': LiteralColor
  readonly '1000': LiteralColor
}

export interface DesignSystem {
  readonly typography: {
    readonly h1: Typography
    readonly h2: Typography
    readonly h3: Typography
    readonly h4: Typography
    readonly h5: Typography
    readonly h6: Typography
    readonly body: Typography
    readonly bodySm: Typography
    readonly bodyXs: Typography
  }
  readonly palette: {
    readonly primary: ColorShades
    readonly secondary: ColorShades
    readonly neutral: ExtendedColorShades
    readonly success: ColorShades
    readonly warning: ColorShades
    readonly error: ColorShades
  }
}

export type DesignSystemElement<T extends keyof DesignSystem = never, D extends number = 10> = [
  T,
] extends [never]
  ? LeafPath<DesignSystem, D>
  : LeafPath<DesignSystem[T], D>

export type NamedColor = DesignSystemElement<'palette'>
export type Color = NamedColor | LiteralColor

export function isLiteralColor(color: Color): color is LiteralColor {
  return color.startsWith('#')
}

export function isOpaque(color: LiteralColor) {
  const alpha = color.substring(7)
  return alpha.length !== 2 || alpha.toLowerCase() == 'ff'
}

export function getOpaqueColor(color: LiteralColor) {
  return color.substring(0, 7)
}

export type TypographyName = DesignSystemElement<'typography', 0>

export interface ThemeConfig {
  readonly colors: {
    readonly contrast: Color
    readonly text: {
      readonly primary: Color
      readonly primaryInverse: Color
      readonly secondary: Color
      readonly secondaryInverse: Color
      readonly secondaryStatic: Color
      readonly tertiary: Color
      readonly tertiaryInverse: Color
      readonly disabled: Color
      readonly brand: Color
      readonly link: Color
      readonly linkHover: Color
      readonly linkFocused: Color
      readonly warning: Color
      readonly negative: Color
      readonly negativeHover: Color
      readonly positive: Color
    }
    readonly background: {
      readonly interface: Color
      readonly primary: Color
      readonly hover: Color
      readonly selected: Color
      readonly neutral: Color
      readonly neutralHover: Color
      readonly disabled: Color
      readonly brand: Color
      readonly brandHover: Color
      readonly brandSecondary: Color
      readonly brandSecondaryHover: Color
      readonly inverse: Color
      readonly secondaryInverse: Color
      readonly info: Color
      readonly infoSubtle: Color
      readonly warning: Color
      readonly warningSubtle: Color
      readonly negative: Color
      readonly negativeHover: Color
      readonly negativeSubtle: Color
      readonly positive: Color
      readonly positiveSubtle: Color
      readonly mono: Color
      readonly monoHover: Color
      readonly systemStatic: Color
    }
    readonly icon: {
      readonly primary: Color
      readonly primaryStatic: Color
      readonly inverse: Color
      readonly selected: Color
      readonly disabled: Color
      readonly info: Color
      readonly warning: Color
      readonly negative: Color
      readonly positive: Color
      readonly inverseStatic: Color
      readonly brand: Color
    }
    readonly border: {
      readonly primary: Color
      readonly subtle: Color
      readonly inverse: Color
      readonly selected: Color
      readonly disabled: Color
      readonly brand: Color
      readonly brandFocus: Color
      readonly info: Color
      readonly warning: Color
      readonly negative: Color
      readonly positive: Color
      readonly mono: Color
      readonly focus: Color
      readonly focusButton: Color
    }
    readonly overlay: Color
  }
}

export type ThemeColor = LeafPath<ThemeConfig['colors']>
