interface FetchedPage<Result> {
  page: number
  result: Result | undefined
}

/**
 * Bridge a numbered-page API (IA's advanced search, or a proxied external platform) to
 * `LazyList`'s arbitrary `skip`/`limit` windowing. A requested window rarely lines up with a
 * page boundary, so fetch the one or two server pages that cover it and slice out the window.
 */
export async function paginateBySkipLimit<Result, Item>(
  fetchPage: (page: number, pageSize: number, signal: AbortSignal) => Promise<Result | undefined>,
  getItems: (result: Result) => Item[],
  skip: number,
  limit: number,
  signal: AbortSignal,
): Promise<{
  skip: number
  data: Item[]
  firstPage: FetchedPage<Result>
  secondPage?: FetchedPage<Result>
}> {
  const firstPageNumber = Math.floor(skip / limit) + 1
  const firstPageResult = await fetchPage(firstPageNumber, limit, signal)

  const extra = skip % limit
  const secondPageResult = extra ? await fetchPage(firstPageNumber + 1, limit, signal) : undefined

  const data = [
    ...(firstPageResult ? getItems(firstPageResult) : []),
    ...(secondPageResult ? getItems(secondPageResult) : []),
  ].slice(extra, extra + limit)

  return {
    skip,
    data,
    firstPage: { page: firstPageNumber, result: firstPageResult },
    ...(extra ? { secondPage: { page: firstPageNumber + 1, result: secondPageResult } } : {}),
  }
}
