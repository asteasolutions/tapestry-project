import { compact, entries, mapKeys, omit } from 'lodash-es'
import { Theme } from './themes.js'
import { Color, DesignSystem, isLiteralColor, LiteralColor, TypographyName } from './types.js'
import Colorjs from 'color'

function kebabCase(str: string) {
  return str
    .split(/[^a-zA-Z0-9]/)
    .flatMap((part) => part.split(/(?<=[a-z])(?=[A-Z])/))
    .map((part) => part.toLowerCase())
    .join('-')
}

function cssRule(prop: string, value: string) {
  return `${kebabCase(prop)}: ${value};`
}

function cssRules(rules: Record<string, string>) {
  return Object.entries(rules).map(([prop, value]) => cssRule(prop, value))
}

function cssVarName(prefix: string, name: string) {
  return `--${kebabCase(`${prefix}-${name}`)}`
}

function cssVarValue(prefix: string, name: string) {
  return `var(${cssVarName(prefix, name)})`
}

function cssVars(prefix: string, vars: Record<string, string>) {
  return cssRules(mapKeys(vars, (_, name) => cssVarName(prefix, name)))
}

function cssBlock(selector: string, props: Record<string, string> | string[]) {
  const rules = Array.isArray(props) ? props : cssRules(props)
  return [`${selector} {`, ...rules.map((rule) => `\t${rule}`), '}'].join('\n')
}

export function serializeDesignSystem(designSystem: DesignSystem) {
  const typographyVariants = Object.keys(
    designSystem.typography,
  ) as (keyof DesignSystem['typography'])[]
  const colorVariants = Object.keys(designSystem.palette) as (keyof DesignSystem['palette'])[]

  const varsDeclaration = cssBlock(':root', [
    ...typographyVariants.flatMap((name) =>
      cssVars(`typography-${name}`, designSystem.typography[name]),
    ),
    ...colorVariants.flatMap((name) =>
      cssVars(`color-${name}`, designSystem.palette[name] as unknown as Record<string, string>),
    ),
  ])

  const typographyClasses = typographyVariants.map((name) =>
    cssBlock(`.${typographyClassName(name)}`, designSystem.typography[name]),
  )

  return [varsDeclaration, ...typographyClasses].join('\n')
}

export function serializeTheme(theme: Theme) {
  function serializeColors(colors: object, prefix = '') {
    return Object.entries(colors).reduce(
      (serializedColors, [key, value]) => {
        const prefixedKey = compact([prefix, key]).join('-')
        if (typeof value === 'string') {
          serializedColors[prefixedKey] = isLiteralColor(value as Color)
            ? value
            : cssVarValue('color', value)
        } else {
          Object.assign(serializedColors, serializeColors(value as object, prefixedKey))
        }
        return serializedColors
      },
      {} as Record<string, string>,
    )
  }

  return cssBlock(':root', cssVars('theme', serializeColors(theme.config.colors)))
}

export function typographyClassName(typography: TypographyName) {
  return `typography-${kebabCase(typography)}`
}

export const TRANSPARENT = '#ffffff00'

export const COLOR_PRESETS = {
  [TRANSPARENT]: 'Transparent',
  '#ffffff': 'White',
  '#9e9e9e': 'Gray',
  '#ff4019': 'Red',
  '#ffaa01': 'Orange',
  '#ffd501': 'Yellow',
  '#f7578c': 'Pink',
  '#2c2c2c': 'Black',
  '#b8e741': 'Light Green',
  '#00796b': 'Dark Green',
  '#a179f2': 'Purple',
  '#1349ed': 'Blue',
} as const satisfies Record<LiteralColor, string>

export const OPAQUE_COLOR_PRESETS = omit(COLOR_PRESETS, TRANSPARENT)

export const COLLABORATOR_COLORS = entries(OPAQUE_COLOR_PRESETS)
  .filter(([, name]) => name !== 'White' && name !== 'Black')
  .map(([code]) => new Colorjs(code).rotate(10).desaturate(0.4).hex()) as LiteralColor[]
