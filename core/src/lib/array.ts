import { reduce, times } from 'lodash'

export function mapNotNull<I, O>(arr: ArrayLike<I>, cb: (el: I) => O): NonNullable<O>[] {
  return reduce(
    arr,
    (acc, el) => {
      const mapped = cb(el)
      if (mapped) {
        acc.push(mapped)
      }
      return acc
    },
    [] as NonNullable<O>[],
  )
}

export function splitInRows<T>(array: T[], nRows = 2): T[][] {
  const elementsPerRow = Math.ceil(array.length / nRows)

  return array.reduce(
    (acc, elem, index) => {
      acc[Math.floor(index / elementsPerRow)].push(elem)
      return acc
    },
    times(Math.min(array.length, nRows), () => []) as T[][],
  )
}

export function toggleElement<T extends { id: unknown }>(array: T[], element: T) {
  let found = false
  const res: T[] = []
  for (const elem of array) {
    if (elem.id === element.id) {
      found = true
    } else {
      res.push(elem)
    }
  }
  if (!found) {
    res.push(element)
  }
  return res
}
