/* eslint-disable @typescript-eslint/no-unsafe-function-type */
export type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ...0[]]

export type Path<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends Date
    ? never
    : T extends unknown[]
      ? `${number}${'' | `.${Path<T[number], Prev[D]>}`}`
      : T extends object
        ? {
            [K in keyof T]-?: T[K] extends Function
              ? never
              : `${Extract<K, string>}${'' | `.${Path<T[K], Prev[D]>}`}`
          }[keyof T]
        : never

type ValueAt<T, K> = K extends keyof T ? T[K] : never
export type ValueAtPath<T, P extends Path<T>> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? Rest extends Path<NonNullable<T[Head]>>
      ? undefined extends T[Head]
        ? ValueAtPath<NonNullable<T[Head]>, Rest> | undefined
        : ValueAtPath<T[Head], Rest>
      : ValueAt<T, P>
    : ValueAt<T, P>
  : ValueAt<T, P>

export type LeafPath<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends Date
    ? never
    : T extends unknown[]
      ? `${number}${LeafPath<T[number], Prev[D]> extends never ? '' : `.${LeafPath<T[number], Prev[D]>}`}`
      : T extends object
        ? {
            [K in keyof T]-?: T[K] extends Function
              ? never
              : `${Extract<K, string>}${LeafPath<T[K], Prev[D]> extends never ? '' : `.${LeafPath<T[K], Prev[D]>}`}`
          }[keyof T]
        : never

export type PickFromOptional<T, K extends keyof NonNullable<T>> = undefined extends T
  ? Pick<NonNullable<T>, K> | undefined
  : Pick<NonNullable<T>, K>

export type KeysOfUnion<T> = T extends T ? keyof T : never

export type PartialDeep<T> = T extends object
  ? {
      [K in keyof T]?: PartialDeep<T[K]>
    }
  : T

export type DistributiveOmit<T, K extends string> = T extends object ? Omit<T, K> : never

export type PrependFunctionParameters<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TFunction extends (...args: any) => any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TParameters extends [...args: any],
> = (...args: [...TParameters, ...Parameters<TFunction>]) => ReturnType<TFunction>

export type RequiredFields<T, K extends keyof T> = T & {
  [P in K]-?: NonNullable<T[P]>
}

export type ValuesOf<T> = T[keyof T]
