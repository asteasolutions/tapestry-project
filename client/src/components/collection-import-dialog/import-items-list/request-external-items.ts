import { paginateBySkipLimit } from './paginate-by-skip-limit'

export async function requestExternalItems<Media>(
  fetchPage: (
    page: number,
    pageSize: number,
    signal: AbortSignal,
  ) => Promise<{ total: number; results: Media[] } | undefined>,
  skip: number,
  limit: number,
  signal: AbortSignal,
) {
  const { data, firstPage, secondPage } = await paginateBySkipLimit(
    fetchPage,
    (result) => result.results,
    skip,
    limit,
    signal,
  )

  return {
    skip,
    data,
    failed: firstPage.result === undefined || (secondPage !== undefined && !secondPage.result),
  }
}
