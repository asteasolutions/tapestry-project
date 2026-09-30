import { useMemo } from 'react'
import {
  fetchWikimediaCategoryResults,
  wikimediaFilePageURL,
  WikimediaMedia,
} from 'tapestry-core/src/wikimedia-commons'
import { ImportItemsListProps } from '..'
import { CollectionImport } from '../../../../pages/tapestry/view-model'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { BaseCollectionList, CollectionListItem } from '../base-collection-list'
import { createDerivedSourceMediaItem } from '../../../../model/data/utils'

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
        const page = await fetchWikimediaCategoryResults(collection.category, nextCursor, signal)
        if (!page) break
        fetched.push(...page.results)
        nextCursor = page.nextCursor
        done = nextCursor === undefined
      }
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
      columns={['uploader', 'dimensions']}
      detailsGroupName="wikimedia-collection-list"
      header={header}
      toListItem={(item): CollectionListItem => ({
        image: item.thumbnail,
        fallbackIcon: NO_THUMBNAIL_ICON[item.mediaType],
        title: item.title,
        uploader: item.uploader ?? undefined,
        dimensions:
          item.width && item.height ? { width: item.width, height: item.height } : undefined,
      })}
      toTapestryItem={(item: WikimediaMedia) =>
        createDerivedSourceMediaItem(tapestryId, {
          source: item.url,
          originalSource: wikimediaFilePageURL(item.id),
          mediaType: item.mediaType,
          size: item.width && item.height ? { width: item.width, height: item.height } : undefined,
        })
      }
      emptyPlaceholder={<Text>No files in this category</Text>}
    />
  )
}
