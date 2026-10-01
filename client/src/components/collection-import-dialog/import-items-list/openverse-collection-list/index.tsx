import { useMemo } from 'react'
import {
  fetchOpenverseCollectionPage,
  openverseMediaPageURL,
  OpenverseMedia,
  OPENVERSE_MAX_PAGE_SIZE,
} from 'tapestry-core/src/openverse'
import { ImportItemsListProps } from '..'
import { CollectionImport } from '../../../../pages/tapestry/view-model'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { BaseCollectionList, CollectionListItem } from '../base-collection-list'
import { createDerivedSourceMediaItem } from '../../../../model/data/utils'

const NO_THUMBNAIL_ICON: Record<'image' | 'audio', IconName> = {
  image: 'image',
  audio: 'audio_file',
}

export type OpenverseCollectionImport = Extract<CollectionImport, { type: 'OpenverseCollection' }>

interface OpenverseCollectionListProps extends Omit<ImportItemsListProps, 'collectionImport'> {
  collection: OpenverseCollectionImport
}

export function OpenverseCollectionList({
  collection,
  header,
  tapestryId,
  ...props
}: OpenverseCollectionListProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD

  const requestItems = useMemo(() => {
    // Openverse's real per-request cap is OPENVERSE_MAX_PAGE_SIZE -- walk forward one real page
    // at a time, buffering everything fetched so far, until the buffer covers the requested
    // window. Always report collection.total (not a page's own result_count): LazyListLoader
    // treats a change in total as a change in the list and does a full reload.
    const fetched: OpenverseMedia[] = []
    let nextRealPage = 1
    let done = false

    return async (skip: number, limit: number, signal: AbortSignal) => {
      while (fetched.length < skip + limit && !done) {
        const page = await fetchOpenverseCollectionPage(
          collection.mediaType,
          collection.collection,
          nextRealPage,
          OPENVERSE_MAX_PAGE_SIZE,
          signal,
        )
        if (!page) break
        fetched.push(...page.results)
        nextRealPage++
        done = fetched.length >= page.result_count
      }
      return { skip, total: collection.total, data: fetched.slice(skip, skip + limit) }
    }
  }, [collection.mediaType, collection.collection, collection.total])

  return (
    <BaseCollectionList
      {...props}
      windowSize={25}
      loadingEdgeProximity={5}
      requestItems={requestItems}
      mdOrLess={mdOrLess}
      columns={['creator', 'license']}
      detailsGroupName="openverse-collection-list"
      header={header}
      toListItem={(item): CollectionListItem => ({
        image: item.thumbnail,
        fallbackIcon: NO_THUMBNAIL_ICON[collection.mediaType],
        title: item.title,
        creator: item.creator ?? undefined,
        license: item.license,
      })}
      toTapestryItem={(item: OpenverseMedia) =>
        createDerivedSourceMediaItem(tapestryId, {
          source: item.url,
          originalSource: openverseMediaPageURL(collection.mediaType, item.id),
          mediaType: collection.mediaType,
          size: item.width && item.height ? { width: item.width, height: item.height } : undefined,
        })
      }
      emptyPlaceholder={
        <Text>
          {`No ${collection.mediaType === 'image' ? 'images' : 'audio items'} in this collection`}
        </Text>
      }
    />
  )
}
