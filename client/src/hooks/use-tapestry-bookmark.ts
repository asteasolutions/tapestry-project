import { TapestryBookmarkDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry-bookmark'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { resource } from '../services/rest-resources'
import { useState } from 'react'

interface UseTapestryBookmarkOptions {
  tapestryId: string
  userId?: string
}

export function useTapestryBookmark({ tapestryId, userId }: UseTapestryBookmarkOptions) {
  const [bookmark, setBookmark] = useState<TapestryBookmarkDto>()

  const { loading: initiallyLoading } = useAsync(
    async ({ signal }) => {
      if (!userId) {
        return
      }
      setBookmark(
        (
          await resource('tapestryBookmarks').list(
            { filter: { 'tapestryId:eq': tapestryId, 'userId:eq': userId }, limit: 1 },
            { signal },
          )
        ).data.at(0),
      )
    },
    [tapestryId, userId],
    { initiallyLoading: true },
  )

  const { perform: toggleBookmark, loading: toggling } = useAsyncAction(
    async ({ signal }, bookmark: TapestryBookmarkDto | undefined) => {
      if (bookmark) {
        await resource('tapestryBookmarks').destroy(
          { id: bookmark.id },
          {
            signal,
          },
        )
        setBookmark(undefined)
      } else {
        setBookmark(
          await resource('tapestryBookmarks').create({ tapestryId }, undefined, {
            signal,
          }),
        )
      }
    },
  )

  const loading = initiallyLoading || toggling

  return {
    isBookmarked: !!bookmark,
    loading,
    toggleBookmark: () => !loading && toggleBookmark(bookmark),
  }
}
