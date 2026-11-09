import { useMemo, useState } from 'react'
import {
  fetchOpenverseCollectionPage,
  openverseMediaPageURL,
  OpenverseMedia,
} from 'tapestry-core/src/openverse'
import { ImportItemsListProps } from '..'
import { CollectionImport } from '../../../../pages/tapestry/view-model'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { BaseCollectionList, CollectionListItem } from '../base-collection-list'
import { createDerivedSourceMediaItem } from '../../../../model/data/utils'
import { sequentialPagesRequest } from '../sequential-pages'

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
  const [failed, setFailed] = useState(false)

  const requestItems = useMemo(
    () =>
      sequentialPagesRequest<OpenverseMedia, number>(async (page = 1, signal) => {
        const response = await fetchOpenverseCollectionPage(
          collection.mediaType,
          collection.collection,
          page,
          signal,
        )
        setFailed(!response && !signal.aborted)
        return (
          response && {
            items: response.results,
            nextCursor: page < response.page_count ? page + 1 : undefined,
            total: response.result_count,
          }
        )
      }),
    [collection.mediaType, collection.collection],
  )

  const mediaLabel = collection.mediaType === 'image' ? 'images' : 'audio items'

  return (
    <BaseCollectionList
      {...props}
      windowSize={10}
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
          {failed
            ? 'Openverse did not respond. Please try again later.'
            : `No ${mediaLabel} in this collection`}
        </Text>
      }
    />
  )
}
