import { LazyListRequestItems } from '../../lazy-list/lazy-list-loader'

export interface SequentialPage<T, Cursor> {
  items: T[]
  nextCursor: Cursor | undefined
  // The size of the whole list, if the API reports it.
  total?: number
}

export class PageLoadError extends Error {}

//Adapts an API that can only be paged in order (by an opaque cursor or a page number) to the
//skip/limit interface of a lazy list. Pages are fetched one at a time and buffered.Calls are
//serialized so that concurrent requests never fetch the same page twice.
export function sequentialPagesRequest<T, Cursor>(
  fetchPage: (
    cursor: Cursor | undefined,
    signal: AbortSignal,
  ) => Promise<SequentialPage<T, Cursor> | null>,
  initialTotal?: number,
): LazyListRequestItems<T> {
  const fetched: T[] = []
  let cursor: Cursor | undefined
  let done = false
  let total = initialTotal
  let queue: Promise<unknown> = Promise.resolve()

  const request = async (skip: number, limit: number, signal: AbortSignal) => {
    while (fetched.length < skip + limit && !done) {
      const page = await fetchPage(cursor, signal)
      signal.throwIfAborted()
      if (!page) throw new PageLoadError('Failed to load the next page')

      fetched.push(...page.items)
      cursor = page.nextCursor
      done = cursor === undefined
      total = page.total ?? total
    }
    return {
      skip,
      total: done ? fetched.length : (total ?? fetched.length),
      data: fetched.slice(skip, skip + limit),
    }
  }

  return (skip, limit, signal) => {
    const result = queue.then(() => request(skip, limit, signal))
    queue = result.catch(() => undefined)
    return result
  }
}
