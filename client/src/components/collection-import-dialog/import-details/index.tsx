import { getIAItemThumbnailURL } from 'tapestry-core/src/internet-archive'
import { fetchWikimediaCollectionThumbnail } from 'tapestry-core/src/wikimedia-commons'
import { CollectionImport } from '../../../pages/tapestry/view-model'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { intlFormat } from 'date-fns'
import { useEffect, useState } from 'react'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

const parser = new DOMParser()

interface ImportDetailsProps {
  import: CollectionImport
}

// TODO: Extract a shared layout component. This removes the duplication between the
// branches below.
export function ImportDetails({ import: collectionImport }: ImportDetailsProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  if (collectionImport.type === 'OpenverseCollection') {
    return <OpenverseCollectionDetails collection={collectionImport} />
  }

  if (collectionImport.type === 'WikimediaCommonsCategory') {
    return <WikimediaCommonsCategoryDetails collection={collectionImport} />
  }

  if (collectionImport.type === 'IASearchCollection') {
    return (
      <div className={styles.root}>
        <div className={styles.header}>
          <div className={styles.metadataContainer}>
            <Text variant={mdOrLess ? 'bodySm' : 'h6'} lineClamp={2} style={{ fontWeight: 'bold' }}>
              Search results
            </Text>
            <Text variant={textVariant} lineClamp={2}>
              {collectionImport.total} results
            </Text>
          </div>
        </div>
        <Text variant={textVariant} component="div">
          {collectionImport.query}
        </Text>
      </div>
    )
  }

  const { id, metadata } = collectionImport
  const description = parser.parseFromString(
    metadata.summary ?? metadata.description ?? '',
    'text/html',
  ).documentElement.textContent

  const isCollection = metadata.mediatype === 'collection'

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <img className={styles.thumbnail} loading="lazy" src={getIAItemThumbnailURL(id)} />
        <div className={styles.metadataContainer}>
          <div>
            <Text variant={mdOrLess ? 'bodySm' : 'h6'} lineClamp={2} style={{ fontWeight: 'bold' }}>
              {metadata.title}
            </Text>
            <Text variant={textVariant} lineClamp={2}>
              {isCollection ? metadata.uploader : metadata.creator}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Text variant={textVariant ?? 'bodySm'}>Publication date</Text>
            <Text variant={textVariant ?? 'bodySm'}>
              {intlFormat(metadata.publicdate, { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </div>
        </div>
      </div>
      <Text variant={textVariant} component="div">
        {description}
      </Text>
    </div>
  )
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

function OpenverseCollectionDetails({ collection }: { collection: OpenverseCollectionImport }) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  return (
    <div className={styles.root}>
      <Text variant={mdOrLess ? 'bodySm' : 'h6'} style={{ fontWeight: 'bold' }}>
        {openverseCollectionLabel(collection.collection)}
      </Text>
      <Text variant={textVariant}>
        {collection.total} {OPENVERSE_MEDIA_TYPE_NOUN[collection.mediaType]}
      </Text>
    </div>
  )
}

function WikimediaCommonsCategoryDetails({
  collection,
}: {
  collection: WikimediaCommonsCategoryImport
}) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined
  const [thumbnail, setThumbnail] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void fetchWikimediaCollectionThumbnail(collection.collection, controller.signal).then(
      setThumbnail,
    )
    return () => controller.abort()
  }, [collection.collection])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        {thumbnail && <img className={styles.thumbnail} loading="lazy" src={thumbnail} />}
        <div className={styles.metadataContainer}>
          <Text variant={mdOrLess ? 'bodySm' : 'h6'} style={{ fontWeight: 'bold' }}>
            {collection.collection.category}
          </Text>
          <Text variant={textVariant}>{collection.total} files</Text>
        </div>
      </div>
    </div>
  )
}
