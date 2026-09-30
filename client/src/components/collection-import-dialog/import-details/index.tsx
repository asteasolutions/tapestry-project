import { ReactNode } from 'react'
import { getIAItemThumbnailURL } from 'tapestry-core/src/internet-archive'
import { fetchWikimediaCategoryDetails } from 'tapestry-core/src/wikimedia-commons'
import { CollectionImport } from '../../../pages/tapestry/view-model'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { intlFormat } from 'date-fns'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'
import { ImageWrapper } from '../image-wrapper'

const parser = new DOMParser()

interface DetailsLayoutProps {
  thumbnail?: string | null
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  body?: ReactNode
}

// The layout shared by every collection import's details panel.
function DetailsLayout({ thumbnail, title, subtitle, meta, body }: DetailsLayoutProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        {thumbnail && <ImageWrapper className={styles.thumbnail} image={thumbnail} />}
        <div className={styles.metadataContainer}>
          <div>
            <Text
              variant={mdOrLess ? 'bodySm' : 'h6'}
              lineClamp={2}
              style={{ fontWeight: 'bold', overflowWrap: 'anywhere' }}
            >
              {title}
            </Text>
            {subtitle !== undefined && (
              <Text variant={textVariant} lineClamp={2} style={{ overflowWrap: 'anywhere' }}>
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

function WikimediaCommonsCategoryDetails({
  collection,
}: {
  collection: Extract<CollectionImport, { type: 'WikimediaCommonsCategory' }>
}) {
  const { data: details } = useAsync(
    ({ signal }) => fetchWikimediaCategoryDetails(collection.category, signal),
    [collection.category],
  )

  return (
    <DetailsLayout
      thumbnail={details?.thumbnail}
      title={collection.category}
      subtitle={`${collection.total} files`}
      body={details?.description}
    />
  )
}

interface ImportDetailsProps {
  import: CollectionImport
}

export function ImportDetails({ import: collectionImport }: ImportDetailsProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  switch (collectionImport.type) {
    case 'OpenverseCollection':
      return (
        <DetailsLayout
          title={
            collectionImport.collection.type === 'tag'
              ? collectionImport.collection.tag
              : collectionImport.collection.source
          }
          subtitle={`${collectionImport.total} ${collectionImport.mediaType === 'image' ? 'images' : 'audio items'}`}
        />
      )

    case 'WikimediaCommonsCategory':
      return <WikimediaCommonsCategoryDetails collection={collectionImport} />

    case 'IASearchCollection':
      return (
        <DetailsLayout
          title="Search results"
          subtitle={`${collectionImport.total} results`}
          body={collectionImport.query}
        />
      )

    case 'IACollection':
    case 'IAPlaylist': {
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
                {intlFormat(metadata.publicdate, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </div>
          }
          body={description}
        />
      )
    }
  }
}
