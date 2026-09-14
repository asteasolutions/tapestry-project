import {
  fetchWikimediaCollectionResults as coreFetchWikimediaCollectionResults,
  WikimediaCollectionQuery,
  WikimediaCursorStore,
} from 'tapestry-core/src/wikimedia-commons'

/**
 * Commons paginates categories with a cursor (`gcmcontinue`), not a page number. Find each real
 * page's cursor once, by walking forward from the start, then remember it for the rest of this
 * browser session — cursors do not go stale. Kept in memory only: unlike the server-side proxy
 * this replaced, there is no need for it to survive a page reload or be shared across users.
 */
const wikimediaCursorsByCollection = new Map<string, Map<number, string | null>>()

function wikimediaCursorStore(collection: WikimediaCollectionQuery): WikimediaCursorStore {
  const key = JSON.stringify(collection)
  const cursors = wikimediaCursorsByCollection.get(key) ?? new Map<number, string | null>()
  wikimediaCursorsByCollection.set(key, cursors)

  return {
    get(realPage) {
      return Promise.resolve(cursors.get(realPage))
    },
    set(realPage, cursor) {
      cursors.set(realPage, cursor)
      return Promise.resolve()
    },
  }
}

export function fetchWikimediaCollectionResults(
  collection: WikimediaCollectionQuery,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
) {
  return coreFetchWikimediaCollectionResults(
    collection,
    page,
    pageSize,
    wikimediaCursorStore(collection),
    signal,
  )
}
