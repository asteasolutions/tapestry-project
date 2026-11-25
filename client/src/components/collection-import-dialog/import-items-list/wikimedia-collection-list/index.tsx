import { useMemo, useState } from 'react'
import {
  fetchWikimediaCategoryResults,
  wikimediaFilePageURL,
  wikimediaTypeToItemType,
  WikimediaMedia,
} from 'tapestry-core/src/wikimedia-commons'
import { MediaItemType } from 'tapestry-core/src/data-format/schemas/item'
import { ImportItemsListProps } from '..'
import { CollectionImport } from '../../../../pages/tapestry/view-model'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import {
  BaseCollectionList,
  CollectionListColumn,
  CollectionListItem,
} from '../base-collection-list'
import { createDerivedSourceMediaItem } from '../../../../model/data/utils'
import { sequentialPagesRequest } from '../sequential-pages'

// Use this icon when a media item has no real thumbnail (Commons' generic per-extension icon,
// already mapped to null in wikimedia-commons.ts).
const NO_THUMBNAIL_ICON: Partial<Record<MediaItemType, IconName>> = {
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
  const [hasNonImage, setHasNonImage] = useState(false)

  const requestItems = useMemo(() => {
    // fetchWikimediaCategoryResults returns every real file, including ones whose type isn't one
    // we can turn into a tapestry item -- filtered out here on the client, not in core, so this
    // list decides what it can actually show/import.
    const isSupported = (item: WikimediaMedia) =>
      wikimediaTypeToItemType(item.mediatype, item.mime) !== null

    // Commons paginates categories with an opaque cursor, so pages are walked in order. The
    // category's file count includes unsupported files, so the total is exact only at the end.
    return sequentialPagesRequest<WikimediaMedia, string>(async (cursor, signal) => {
      const page = await fetchWikimediaCategoryResults(collection.category, cursor, signal)
      if (!page) return null

      const supported = page.results.filter(isSupported)
      if (
        supported.some((item) => wikimediaTypeToItemType(item.mediatype, item.mime) !== 'image')
      ) {
        setHasNonImage(true)
      }
      return { items: supported, nextCursor: page.nextCursor }
    }, collection.total)
  }, [collection.category, collection.total])

  const columns: CollectionListColumn[] = hasNonImage ? ['published'] : ['published', 'dimensions']

  return (
    <BaseCollectionList
      {...props}
      windowSize={25}
      loadingEdgeProximity={5}
      requestItems={requestItems}
      mdOrLess={mdOrLess}
      columns={columns}
      detailsGroupName="wikimedia-collection-list"
      header={header}
      toListItem={(item): CollectionListItem => ({
        image: item.thumbnail,
        fallbackIcon: NO_THUMBNAIL_ICON[wikimediaTypeToItemType(item.mediatype, item.mime)!],
        title: item.title,
        published: item.uploadedAt,
        dimensions:
          item.width && item.height ? { width: item.width, height: item.height } : undefined,
      })}
      toTapestryItem={(item: WikimediaMedia) =>
        createDerivedSourceMediaItem(tapestryId, {
          source: item.url,
          originalSource: wikimediaFilePageURL(item.id),
          mediaType: wikimediaTypeToItemType(item.mediatype, item.mime)!,
          size: item.width && item.height ? { width: item.width, height: item.height } : undefined,
        })
      }
      emptyPlaceholder={<Text>No files in this category</Text>}
    />
  )
}
