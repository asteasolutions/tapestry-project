import { CSSProperties } from 'react'

type StyleProp = { style?: CSSProperties }
type ClassNameProp = { className?: string }
type ClassesProp<C extends string> = { classes?: Partial<Record<C, string>> }

export type PropsWithStyle<P = object, Classes extends string = never> = [Classes] extends [never]
  ? P & StyleProp & ClassNameProp
  : P & StyleProp & ClassesProp<Classes>
