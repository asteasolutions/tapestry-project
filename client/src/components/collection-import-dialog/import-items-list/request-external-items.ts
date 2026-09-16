import { paginateBySkipLimit } from './paginate-by-skip-limit'

const FETCH_RETRY_ATTEMPTS = 3
const FETCH_RETRY_DELAY_MS = 4000

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timeout = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timeout)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

// LazyListLoader replaces the whole list on every fetch. This includes its own periodic reload.
// A single failed fetch would then clear the list. Retry first. Space the retries past the
// proxy's short failure-cache time.
async function fetchPageWithRetry<Result>(
  fetchPage: (page: number, pageSize: number, signal: AbortSignal) => Promise<Result | undefined>,
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<Result | undefined> {
  for (let attempt = 0; attempt < FETCH_RETRY_ATTEMPTS; attempt++) {
    const result = await fetchPage(page, pageSize, signal)
    if (result) return result
    if (attempt < FETCH_RETRY_ATTEMPTS - 1) await delay(FETCH_RETRY_DELAY_MS, signal)
  }
  return undefined
}

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
    (page, pageSize, pageSignal) => fetchPageWithRetry(fetchPage, page, pageSize, pageSignal),
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
