import { getIAItemThumbnailURL } from 'tapestry-core/src/internet-archive'
import { CollectionImport } from '../../../pages/tapestry/view-model'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { intlFormat } from 'date-fns'
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

function CollectionDetailsLayout({
  label,
  total,
  noun,
}: {
  label: string
  total: number
  noun: string
}) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  return (
    <div className={styles.root}>
      <Text variant={mdOrLess ? 'bodySm' : 'h6'} style={{ fontWeight: 'bold' }}>
        {label}
      </Text>
      <Text variant={textVariant}>
        {total} {noun}
      </Text>
    </div>
  )
}

const OPENVERSE_MEDIA_TYPE_NOUN: Record<OpenverseCollectionImport['mediaType'], string> = {
  image: 'images',
  audio: 'audio items',
}

function openverseCollectionLabel(collection: OpenverseCollectionImport['collection']): string {
  return collection.type === 'tag' ? collection.tag : collection.source
}

function OpenverseCollectionDetails({ collection }: { collection: OpenverseCollectionImport }) {
  return (
    <CollectionDetailsLayout
      label={openverseCollectionLabel(collection.collection)}
      total={collection.total}
      noun={OPENVERSE_MEDIA_TYPE_NOUN[collection.mediaType]}
    />
  )
}

function WikimediaCommonsCategoryDetails({
  collection,
}: {
  collection: WikimediaCommonsCategoryImport
}) {
  return (
    <CollectionDetailsLayout
      label={collection.collection.category}
      total={collection.total}
      noun="files"
    />
  )
}
