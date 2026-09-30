import { useMemo, useState } from 'react'
import {
  fetchWikimediaCollectionResults,
  wikimediaFilePageURL,
  WikimediaMedia,
} from 'tapestry-core/src/wikimedia-commons'
import { ImportItemsListProps } from '..'
import { CollectionImport } from '../../../../pages/tapestry/view-model'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { BaseCollectionList, CollectionListItem } from '../base-collection-list'
import { createExternalMediaItem } from '../../../../stage/item-factories'

// Use this icon when a media item has no real thumbnail (Commons' generic per-extension icon,
// already mapped to null in wikimedia-commons.ts).
const NO_THUMBNAIL_ICON: Record<WikimediaMedia['mediaType'], IconName> = {
  image: 'image',
  audio: 'audio_file',
  video: 'video_file',
  pdf: 'picture_as_pdf',
}

export type WikimediaCommonsCategoryImport = Extract<
  CollectionImport,
  { type: 'WikimediaCommonsCategory' }
>

interface WikimediaCollectionListProps extends Omit<ImportItemsListProps, 'collectionImport'> {
  collection: WikimediaCommonsCategoryImport
}

export function WikimediaCollectionList({
  collection,
  header,
  tapestryId,
  ...props
}: WikimediaCollectionListProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const [loadFailed, setLoadFailed] = useState(false)

  const requestItems = useMemo(() => {
    // Commons paginates categories with an opaque cursor, not a page number -- there's no way to
    // jump directly to an arbitrary skip. Walk forward from wherever this category's walk last
    // left off, fetching one real page at a time and buffering everything fetched so far, until
    // the buffer covers the requested window. Cursors (and the buffered items) live for as long
    // as this component does; they don't go stale.
    const fetched: WikimediaMedia[] = []
    let nextCursor: string | undefined
    let done = false

    return async (skip: number, limit: number, signal: AbortSignal) => {
      while (fetched.length < skip + limit && !done) {
        const page = await fetchWikimediaCollectionResults(collection.category, nextCursor, signal)
        if (!page) {
          setLoadFailed(true)
          return { skip, total: collection.total, data: fetched.slice(skip, skip + limit) }
        }
        fetched.push(...page.results)
        nextCursor = page.nextCursor
        done = nextCursor === undefined
      }
      setLoadFailed(false)
      return { skip, total: collection.total, data: fetched.slice(skip, skip + limit) }
    }
  }, [collection.category, collection.total])

  return (
    <BaseCollectionList
      {...props}
      windowSize={25}
      loadingEdgeProximity={5}
      requestItems={requestItems}
      mdOrLess={mdOrLess}
      columns={['uploader']}
      detailsGroupName="wikimedia-collection-list"
      header={header}
      toListItem={(item): CollectionListItem => ({
        image: item.thumbnail,
        fallbackIcon: NO_THUMBNAIL_ICON[item.mediaType],
        title: item.title,
        uploader: item.uploader ?? undefined,
      })}
      toTapestryItem={(item: WikimediaMedia) =>
        createExternalMediaItem(tapestryId, {
          url: item.url,
          pageUrl: wikimediaFilePageURL(item.id),
          mediaType: item.mediaType,
        })
      }
      emptyPlaceholder={
        <Text>
          {loadFailed
            ? "Couldn't load items right now — try again in a moment"
            : 'No files in this category'}
        </Text>
      }
    />
  )
}
