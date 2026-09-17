import { ReactNode, useEffect, useState } from 'react'
import { getIAItemThumbnailURL } from 'tapestry-core/src/internet-archive'
import { fetchWikimediaCollectionThumbnail } from 'tapestry-core/src/wikimedia-commons'
import { CollectionImport } from '../../../pages/tapestry/view-model'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { intlFormat } from 'date-fns'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

const parser = new DOMParser()

interface DetailsLayoutProps {
  thumbnail?: string | null
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  body?: ReactNode
}

// The layout shared by every collection import's details panel: an optional thumbnail beside a
// title/subtitle, an optional metadata row, and an optional longer body. Each collection type
// below only differs in which of these optional pieces it has data for.
function DetailsLayout({ thumbnail, title, subtitle, meta, body }: DetailsLayoutProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        {thumbnail && <img className={styles.thumbnail} loading="lazy" src={thumbnail} />}
        <div className={styles.metadataContainer}>
          <div>
            <Text variant={mdOrLess ? 'bodySm' : 'h6'} lineClamp={2} style={{ fontWeight: 'bold' }}>
              {title}
            </Text>
            {subtitle !== undefined && (
              <Text variant={textVariant} lineClamp={2}>
                {subtitle}
              </Text>
            )}
          </div>
          {meta}
        </div>
      </div>
      {body !== undefined && (
        <Text variant={textVariant} component="div">
          {body}
        </Text>
      )}
    </div>
  )
}

interface ImportDetailsProps {
  import: CollectionImport
}

type OpenverseCollectionImport = Extract<CollectionImport, { type: 'OpenverseCollection' }>
type WikimediaCommonsCategoryImport = Extract<
  CollectionImport,
  { type: 'WikimediaCommonsCategory' }
>

const OPENVERSE_MEDIA_TYPE_NOUN: Record<OpenverseCollectionImport['mediaType'], string> = {
  image: 'images',
  audio: 'audio items',
}

function openverseCollectionLabel(collection: OpenverseCollectionImport['collection']): string {
  return collection.type === 'tag' ? collection.tag : collection.source
}

function WikimediaCommonsCategoryDetails({
  collection,
}: {
  collection: WikimediaCommonsCategoryImport
}) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void fetchWikimediaCollectionThumbnail(collection.collection, controller.signal).then(
      setThumbnail,
    )
    return () => controller.abort()
  }, [collection.collection])

  return (
    <DetailsLayout
      thumbnail={thumbnail}
      title={collection.collection.category}
      subtitle={`${collection.total} files`}
    />
  )
}

export function ImportDetails({ import: collectionImport }: ImportDetailsProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  if (collectionImport.type === 'OpenverseCollection') {
    return (
      <DetailsLayout
        title={openverseCollectionLabel(collectionImport.collection)}
        subtitle={`${collectionImport.total} ${OPENVERSE_MEDIA_TYPE_NOUN[collectionImport.mediaType]}`}
      />
    )
  }

  if (collectionImport.type === 'WikimediaCommonsCategory') {
    return <WikimediaCommonsCategoryDetails collection={collectionImport} />
  }

  if (collectionImport.type === 'IASearchCollection') {
    return (
      <DetailsLayout
        title="Search results"
        subtitle={`${collectionImport.total} results`}
        body={collectionImport.query}
      />
    )
  }

  const { id, metadata } = collectionImport
  const description = parser.parseFromString(
    metadata.summary ?? metadata.description ?? '',
    'text/html',
  ).documentElement.textContent
  const isCollection = metadata.mediatype === 'collection'

  return (
    <DetailsLayout
      thumbnail={getIAItemThumbnailURL(id)}
      title={metadata.title}
      subtitle={isCollection ? metadata.uploader : metadata.creator}
      meta={
        <div style={{ display: 'flex', gap: '12px' }}>
          <Text variant={textVariant ?? 'bodySm'}>Publication date</Text>
          <Text variant={textVariant ?? 'bodySm'}>
            {intlFormat(metadata.publicdate, { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </div>
      }
      body={description}
    />
  )
}
